const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");
const { google } = require("googleapis");
const { requireAuth } = require("../middleware/auth");
const { extractDriveId } = require("../utils/extractDriveId");

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_ORIGIN,
  JWT_SECRET,
} = process.env;

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").toLowerCase());
}
function makeOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getAuthedClientForUser(user) {
  if (!user?.googleAuth?.refresh_token) {
    const e = new Error("Google account not linked with refresh_token");
    e.code = "NO_REFRESH_TOKEN";
    throw e;
  }
  const client = makeOAuthClient();
  client.setCredentials({
    refresh_token: user.googleAuth.refresh_token,
    access_token: user.googleAuth.access_token || undefined,
    expiry_date: user.googleAuth.expiry_date || undefined,
  });
  return client;
}

async function downloadDriveFile(oauthClient, fileId) {
  const drive = google.drive({ version: "v3", auth: oauthClient });
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}
function normalizePhone(p) {
  if (!p) return "";
  // keep digits + common separators for display; store as provided for now
  return String(p).trim();
}

function signToken(user) {
  // Keep payload small; include _id and email at minimum
  const payload = { _id: user._id, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function sendGmailWithAttachment(
  oauthClient,
  { to, subject, text, filename, data }
) {
  const gmail = google.gmail({ version: "v1", auth: oauthClient });

  // build raw MIME
  const boundary = "foo_bar_baz_" + Date.now();
  const message = [
    `MIME-Version: 1.0`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    text || "",
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${filename}"`,
    ``,
    data.toString("base64"),
    `--${boundary}--`,
    ``,
  ].join("\r\n");

  const raw = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}

// GET /api/auth/google/start?redirect=/home   (redirect is optional)
router.get("/google/start", (req, res) => {
  const redirect = req.query.redirect || "/home";
  const state = jwt.sign({ redirect }, JWT_SECRET, { expiresIn: "15m" });

  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.readonly", // read user’s template anywhere
    "https://www.googleapis.com/auth/drive.file", // create/write our copies/exports
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/gmail.send",
  ];

  const client = makeOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline", // want refresh_token
    prompt: "consent", // force refresh_token first time
    include_granted_scopes: true,
    scope: scopes,
    state,
  });

  return res.redirect(url);
});

// GET /api/auth/google/callback?code=...&state=...
router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send("Missing code/state");

    // verify state (redirect target)
    let redirect = "/home";
    try {
      const payload = jwt.verify(state, JWT_SECRET);
      if (payload?.redirect) redirect = payload.redirect;
    } catch {}

    const client = makeOAuthClient();
    let tokens;
    try {
      const r = await client.getToken(code);
      tokens = r.tokens;
    } catch (e) {
      console.error("getToken failed:", e?.response?.data || e?.message || e);
      return res.status(500).send("OAuth error (token exchange)");
    }
    client.setCredentials(tokens);

    // get profile
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    const email = me?.data?.email;
    const name = me?.data?.name || "";

    if (!email) return res.status(400).send("No email from Google");

    const update = {
      // DO NOT put "email" inside update when using $setOnInsert with email
      name: name || undefined,
      googleAuth: {
        access_token: tokens.access_token || "",
        refresh_token: tokens.refresh_token || "", // may be empty on subsequent consents
        scope: tokens.scope || "",
        token_type: tokens.token_type || "Bearer",
        expiry_date: tokens.expiry_date || null,
      },
    };

    const user = await User.findOneAndUpdate(
      { email }, // filter
      { $setOnInsert: { email }, $set: update }, // no duplicate "email"
      { new: true, upsert: true }
    );

    const needsProfile = !user.name || !user.phone || !user.mailingAddress;
    const appToken = signToken(user);
    const dest = `${FRONTEND_ORIGIN}/oauth/callback?token=${encodeURIComponent(
      appToken
    )}&r=${encodeURIComponent(redirect)}${needsProfile ? "&np=1" : ""}`;
    console.log("OAuth success, in /google/callback redirecting to:", dest);
    return res.redirect(dest);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return res.status(500).send("OAuth error");
  }
});
// POST /api/auth/register
// body: { email, password, name, phone, mailingAddress }
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, phone, mailingAddress } = req.body || {};

    // Basic validation
    if (!email || !validateEmail(email)) {
      return res
        .status(400)
        .json({ ok: false, message: "Valid email is required" });
    }
    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ ok: false, message: "Password must be at least 8 characters" });
    }
    if (!name || !phone || !mailingAddress) {
      return res.status(400).json({
        ok: false,
        message: "Name, phone, and mailing address are required",
      });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res
        .status(409)
        .json({ ok: false, message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: String(name).trim(),
      phone: normalizePhone(phone),
      mailingAddress: String(mailingAddress).trim(),
    });

    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        mailingAddress: user.mailingAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Registration failed" });
  }
});

// POST /api/auth/complete-profile
// body: { name, phone, mailingAddress }

router.post("/complete-profile", requireAuth, async (req, res) => {
  try {
    const { name, phone, mailingAddress, templateGoogleDocId } = req.body || {};
    if (!name || !phone || !mailingAddress || !templateGoogleDocId) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const extraxtedDriveId = extractDriveId(templateGoogleDocId);
    if (!extraxtedDriveId) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid Google Doc link or file ID" });
    }

    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          name,
          phone,
          mailingAddress,
          templateGoogleDocId: extraxtedDriveId,
        },
      }
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("complete-profile error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});
// POST /api/auth/login
// body: { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "Email and password are required" });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user)
      return res
        .status(401)
        .json({ ok: false, message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res
        .status(401)
        .json({ ok: false, message: "Invalid credentials" });

    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        mailingAddress: user.mailingAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ ok: false });

    const needsProfile =
      !user.name ||
      !user.phone ||
      !user.mailingAddress ||
      user.templateGoogleDocId === undefined ||
      user.templateGoogleDocId === "";
    const templateID = user.templateGoogleDocId;
    console.log("templateID:", templateID);
    // Only return what the client needs
    const out = {
      _id: user._id,
      email: user.email,
      name: user.name || "",
      phone: user.phone || "",
      mailingAddress: user.mailingAddress || "",
      templateGoogleDocId: user.templateGoogleDocId || "",
    };

    res.json({ ok: true, user: out, needsProfile });
  } catch (e) {
    console.error("auth/me error:", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = { router, getAuthedClientForUser, sendGmailWithAttachment };

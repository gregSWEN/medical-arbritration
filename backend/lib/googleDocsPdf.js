// backend/lib/googleDocsPdf.js
const { google } = require("googleapis");

// -------------- helpers --------------
function extractGoogleFileId(input = "") {
  const s = String(input).trim();
  if (!s) return "";
  const m1 = s.match(/\/d\/([a-zA-Z0-9-_]+)/); // https://docs.google.com/document/d/<ID>/edit
  if (m1) return m1[1];
  const m2 = s.match(/[?&]id=([a-zA-Z0-9-_]+)/); // ...?id=<ID>
  if (m2) return m2[1];
  return s; // looks like a bare ID
}

// Given a user object that contains googleAuth.refresh_token/access_token
function makeOAuthClientFromUser(user) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
    process.env;
  if (!user?.googleAuth?.refresh_token) {
    const e = new Error("Google account not linked with refresh_token");
    e.code = "NO_REFRESH_TOKEN";
    throw e;
  }
  const client = new (require("google-auth-library").OAuth2Client)(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  client.setCredentials({
    refresh_token: user.googleAuth.refresh_token,
    access_token: user.googleAuth.access_token || undefined,
    expiry_date: user.googleAuth.expiry_date || undefined,
  });
  return client;
}

// -------------- main --------------
/**
 * Generate a PDF from a Google Doc template.
 * @param {object} submission  - your Submission doc (plain object ok)
 * @param {object} user        - your User doc (plain object ok; must include googleAuth tokens)
 * @param {object} opts        - { templateId?: string, dataMap?: Record<string,string> }
 *   - templateId: file ID or full URL (if omitted, will try user.templateGoogleDocId)
 *   - dataMap:    explicit replacements (if omitted, we require caller to pass map or use buildTemplateData before calling this)
 */
async function generatePdfFromGoogleDoc(submission, user, opts = {}) {
  const templateIdRaw = opts.templateId || user.templateGoogleDocId || "";
  const templateId = extractGoogleFileId(templateIdRaw);
  if (!templateId) {
    const e = new Error("No template Google Doc ID provided");
    e.code = "NO_TEMPLATE";
    throw e;
  }

  const auth = makeOAuthClientFromUser(user);
  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });

  // 0) Verify template exists & is a Google Doc (or at least readable)
  const meta = await drive.files.get({
    fileId: templateId,
    fields: "id,name,mimeType,owners/displayName",
    supportsAllDrives: true,
  });
  const mime = meta.data.mimeType;
  if (mime !== "application/vnd.google-apps.document") {
    // You can export a DOCX ID if Drive auto-converts on copy, but be explicit:
    // We will copy it and let Drive convert to Google Doc automatically.
    // Nothing to do here; just informational.
  }

  // 1) Copy the template to a working Doc
  const workingName = `Open Negotiation – ${
    submission.claimNo || submission._id
  }`;
  const copyResp = await drive.files.copy({
    fileId: templateId,
    requestBody: { name: workingName },
    supportsAllDrives: true,
  });
  const workingDocId = copyResp.data.id;
  if (!workingDocId) {
    throw new Error("Drive copy failed: no id returned");
  }

  // 2) Build replace requests
  //    You can pass an explicit map via opts.dataMap, or prebuild in the caller (recommended).
  //    If you prefer to call buildTemplateData here, import it and do it now.
  const map = opts.dataMap;
  if (!map || typeof map !== "object" || !Object.keys(map).length) {
    throw new Error("No replacement map provided to Google Docs generator");
  }

  const requests = Object.entries(map).map(([key, value]) => ({
    replaceAllText: {
      containsText: { text: `{{${key}}}`, matchCase: false },
      replaceText: value === null || value === undefined ? "" : String(value),
    },
  }));

  if (requests.length === 0) {
    throw new Error("Replacement request list is empty");
  }

  // 3) Apply replacements on the working doc
  await docs.documents.batchUpdate({
    documentId: workingDocId,
    requestBody: { requests },
  });

  // 4) Export to PDF (must be a Google Doc at this point)
  const pdfResp = await drive.files.export(
    { fileId: workingDocId, mimeType: "application/pdf" },
    { responseType: "arraybuffer" }
  );
  if (!pdfResp || !pdfResp.data) {
    throw new Error("Drive export returned empty response");
  }
  const pdfBuffer = Buffer.from(pdfResp.data);

  return { pdfBuffer, workingDocId };
}

module.exports = { generatePdfFromGoogleDoc };

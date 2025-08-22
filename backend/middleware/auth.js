const jwt = require("jsonwebtoken");

//this will be attached to all requests that require authentication with a bearer token
//
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token)
    return res.status(401).json({ ok: false, message: "Missing token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}
module.exports = { requireAuth };

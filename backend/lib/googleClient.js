const { google } = require("googleapis");

function makeOAuthClient() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI, // e.g. http://localhost:5174/api/auth/google/callback
  } = process.env;

  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  return client;
}

function getGoogleClientForUser(user) {
  if (!user?.googleAuth?.refresh_token) {
    const e = new Error("Missing Google refresh token on user");
    e.code = "NO_REFRESH_TOKEN";
    throw e;
  }
  const client = makeOAuthClient();
  client.setCredentials({
    refresh_token: user.googleAuth.refresh_token,
    access_token: user.googleAuth.access_token || undefined,
    expiry_date: user.googleAuth.expiry_date || undefined,
    token_type: user.googleAuth.token_type || "Bearer",
    scope: user.googleAuth.scope || undefined,
  });
  return client;
}

module.exports = { makeOAuthClient, getGoogleClientForUser };

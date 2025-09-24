// lambda.js
const serverless = require("serverless-http");
const { createApp } = require("./app");

// IMPORTANT: app creation must NOT call app.listen() or hard-fail on DB
const app = createApp();

// Liveness — never touches DB
app.get("/health", (_req, res) =>
  res.status(200).json({ ok: true, ts: new Date().toISOString() })
);

// DB readiness — tells you exactly if Atlas/network/URI are the problem
let _mongoClient; // cached across invocations
app.get("/db-ping", async (_req, res) => {
  try {
    // If you use native driver:
    const { MongoClient } = require("mongodb");
    if (!_mongoClient || !_mongoClient.topology?.isConnected?.()) {
      _mongoClient = new MongoClient(process.env.MONGO_URL);
      await _mongoClient.connect();
    }
    await _mongoClient.db().command({ ping: 1 });
    res.json({ db: "ok" });
  } catch (e) {
    console.error("DB ping failed:", e);
    res.status(500).json({ db: "fail", message: e.message });
  }
});

// Keep Lambda from waiting on open DB sockets between invocations
const wrapped = serverless(app, {
  // small fix
  binary: ["application/pdf", "application/octet-stream"],
});

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    return await wrapped(event, context);
  } catch (e) {
    console.error("Unhandled:", e);
    return { statusCode: 500, body: "Internal error" };
  }
};

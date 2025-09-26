// backend/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Only for local dev; harmless in Lambda if .env isn't there
require("dotenv").config();

const { ensureDb } = require("./db");

function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || true,
      credentials: false,
    })
  );
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

  // Liveness — must never touch DB
  app.get("/health", (_req, res) =>
    res.json({ ok: true, ts: new Date().toISOString() })
  );

  // DB-readiness guard (add before routes that require DB)
  const requireDb = async (req, res, next) => {
    try {
      await ensureDb();
      next();
    } catch (e) {
      console.error("DB connect failed:", e);
      res.status(500).json({ db: "fail", message: e.message });
    }
  };

  // Example: auth & submissions need the DB
  const auth = require("./routes/auth");
  app.use("/api/auth", requireDb, auth.router);
  app.use("/api/submissions", requireDb, require("./routes/submissions"));

  // Local test
  app.get("/hi", (_req, res) => res.send({ Message: "Server is up" }));

  return app;
}

module.exports = { createApp };

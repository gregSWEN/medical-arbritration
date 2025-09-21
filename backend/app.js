const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
require("./db");

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

  app.get("/health", (_req, res) => res.json({ ok: true }));

  const auth = require("./routes/auth");
  app.use("/api/auth", auth.router);
  app.use("/api/submissions", require("./routes/submissions"));

  // Local test route
  app.get("/hi", (_req, res) => res.send({ Message: "Server is up" }));

  return app;
}

module.exports = { createApp };

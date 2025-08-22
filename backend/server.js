const express = require("express");
const cors = require("cors");
const helmet = require("helmet"); //for adding and removing required HTTP headers for security
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
require("./db");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true, // to be changed to the ec2 instance ip
    credentials: false,
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/submissions", require("./routes/submissions"));

const port = process.env.PORT || 5174;

app.get("/hi", (req, res) => {
  res.send({ Message: "Server is up" });
});
app.listen(port, () => console.log(`API listening on :${port}`));

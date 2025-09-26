// backend/db.js
const mongoose = require("mongoose");

// Reuse a single connect() promise across invocations
let connectPromise;

async function ensureDb() {
  const uri = process.env.MONGO_URL;
  // Don't crash cold start if env is missing; callers decide what to do
  if (!uri) {
    console.warn("MONGO_URL not set; skipping DB connect");
    return null;
  }

  // Already connected?
  if (mongoose.connection.readyState === 1) return mongoose; // 1 = connected

  // Already trying to connect?
  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 2000, // keep cold starts snappy
      })
      .catch((err) => {
        // Allow a future retry on next request if this one failed
        connectPromise = undefined;
        throw err;
      });
  }

  await connectPromise;
  return mongoose;
}

module.exports = { ensureDb, mongoose };

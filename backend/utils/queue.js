const { Queue } = require("bullmq");
const IORedis = require("ioredis");

let q = null;
function getQueue() {
  if (process.env.REDIS_URL) {
    if (!q) {
      const connection = new IORedis(process.env.REDIS_URL);
      q = new Queue("followups", { connection });
    }
    return q;
  }
  return null; // fallback handled by caller
}

module.exports = { getQueue };

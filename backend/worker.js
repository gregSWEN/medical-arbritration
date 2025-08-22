require("dotenv").config();
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { sendMail } = require("./utils/email");

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL not set; worker not needed (using dev fallback).");
  process.exit(0);
}

const connection = new IORedis(process.env.REDIS_URL);

new Worker(
  "followups",
  async (job) => {
    const { submitterEmail, claimNo } = job.data;
    await sendMail({
      to: submitterEmail,
      subject: `Reminder: review insurer response for claim ${claimNo}`,
      text: `It's time to review and re-submit based on insurer response.`,
    });
    return true;
  },
  { connection }
);

console.log("Worker running...");

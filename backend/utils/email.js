const nodemailer = require("nodemailer");

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, text, attachments }) {
  const t = getTransporter();
  return t.sendMail({
    from: "no-reply@yourclinic.com",
    to,
    subject,
    text,
    attachments,
  });
}
module.exports = { sendMail };

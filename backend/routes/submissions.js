const router = require("express").Router();
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const Submission = require("../models/Submission");
const { businessDelayMs } = require("../utils/businessDays");
const { getQueue } = require("../utils/queue");
const { sendMail } = require("../utils/email");

// routes/submissions.js
function buildQuery(q) {
  const filter = {};

  if (q.submittedFrom || q.submittedTo) {
    const range = {};
    if (q.submittedFrom) {
      // include the whole start day (UTC)
      range.$gte = new Date(`${q.submittedFrom}T00:00:00.000Z`);
    }
    if (q.submittedTo) {
      // make it exclusive of the next day's midnight
      const end = new Date(`${q.submittedTo}T00:00:00.000Z`);
      range.$lt = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    filter.dateSubmittedIso = range;
  }

  if (q.doctor) filter.doctor = q.doctor;
  if (q.insurance) filter.insurance = q.insurance;
  if (q.claimNo) filter.claimNo = new RegExp(q.claimNo, "i");
  if (q.cpt) filter["cpts.code"] = q.cpt;

  return filter;
}

function toWideRow(doc) {
  const base = {
    submitted_at: doc.dateSubmittedIso?.toISOString() ?? "",
    due_at: doc.dueDateIso?.toISOString() ?? "",
    claim_no: doc.claimNo,
    insurance: doc.insurance,
    doctor: doc.doctor,
    patient: doc.patient || doc.patientName || "",
    billed: doc.totals?.billed ?? 0,
    paid: doc.totals?.paid ?? 0,
  };
  // Flatten up to 7 CPTs as columns
  const out = { ...base };
  const max = 7;
  for (let i = 0; i < max; i++) {
    const c = doc.cpts?.[i];
    out[`CPT${i + 1}`] = c?.code ?? "";
    out[`CPT${i + 1}_COUNT`] = c?.count ?? "";
    out[`CPT${i + 1}_IP`] = c?.initialPayment ?? "";
  }
  return out;
}

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCsv(rows) {
  if (!rows.length)
    return "submitted_at,due_at,claim_no,insurance,doctor,patient,billed,paid\n";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

// zod schema to validate payload from the React form
const CPT = z.object({
  code: z.string(),
  count: z.number().min(1),
  initialPayment: z.number().min(0),
});
const SubmissionSchema = z.object({
  id: z.string().min(1),
  claimNo: z.string().min(1),
  patient: z.string().min(1),
  insurance: z.string().min(1),
  providerAccountNo: z.string().min(1),
  doctor: z.string().min(1),
  dateOfService: z.string().min(1),
  submitterEmail: z.string().email(),
  cpts: z.array(CPT).min(1).max(7),
  totals: z.object({ paid: z.number(), billed: z.number() }),
  dateSubmittedIso: z.string(),
  dueDateIso: z.string(),
});

// optional: whitelist of insurer → email fetched from DB later
const INSURER_EMAILS = {
  "MERITAIN HEALTH": "claims@example.com",
  // TODO: move to DB
};

router.post("/", requireAuth, async (req, res) => {
  // 1) validate
  const data = SubmissionSchema.parse(req.body);

  // 2) persist
  const saved = await Submission.create(data);

  // 3) email insurer (stub)
  const insurerEmail = INSURER_EMAILS[data.insurance];
  if (!insurerEmail) {
    return res
      .status(400)
      .json({ ok: false, message: "Unknown insurer email – configure first" });
  }

  // NOTE: attach a real PDF later. For now just send a plain email.
  // await sendMail({
  //   to: insurerEmail,
  //   subject: "Open Negotiation",
  //   text: `Negotiation request for claim ${data.claimNo}. (PDF to be attached later.)`,
  // });

  // 4) schedule 30-business-day follow-up to submitter
  // const delay = businessDelayMs(30, data.dateSubmittedIso);
  // const q = getQueue();
  // if (q) {
  //   await q.add(
  //     "followup",
  //     { submitterEmail: data.submitterEmail, claimNo: data.claimNo },
  //     { delay }
  //   );
  // } else {
  //   // Dev fallback (NOT for production; dies if server restarts)
  //   setTimeout(() => {
  //     sendMail({
  //       to: data.submitterEmail,
  //       subject: `Reminder: review insurer response for claim ${data.claimNo}`,
  //       text: `It's time to review and re-submit based on insurer response.`,
  //     }).catch(() => {});
  //   }, delay);
  // }

  await Submission.updateOne({ _id: saved._id }, { status: "followup_queued" });

  res.json({ ok: true, message: "Insurer email sent; follow-up scheduled." });
});

// GET /api/submissions/export?...same filters...
router.get("/export", requireAuth, async (req, res) => {
  const filter = buildQuery(req.query);
  const items = await Submission.find(filter)
    .sort({ dateSubmittedIso: -1 })
    .limit(100000) // safety cap
    .lean();

  const wide = items.map(toWideRow);
  const csv = toCsv(wide);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="submissions_${Date.now()}.csv"`
  );
  res.send(csv);
});
// GET /api/submissions?submittedFrom=YYYY-MM-DD&submittedTo=YYYY-MM-DD&doctor=...&insurance=...&cpt=...&claimNo=...&limit=50
router.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(5000, Number(req.query.limit || 50));
  const filter = buildQuery(req.query);
  const items = await Submission.find(filter)
    .sort({ dateSubmittedIso: -1 })
    .limit(limit)
    .lean();
  res.json({ items });
});

module.exports = router;

// backend/routes/submissions.js
const express = require("express");
const Submission = require("../models/Submission");
const { requireAuth } = require("../middleware/auth");
const {
  getAuthedClientForUser,
  sendGmailWithAttachment,
} = require("../routes/auth.js");
const { computePhase } = require("../lib/phase");
const { toCsv } = require("../utils/csv");
const { buildTemplateData } = require("../lib/buildTemplateData");
const { generatePdfFromGoogleDoc } = require("../lib/googleDocsPdf");
const { getBucket } = require("../lib/gridfs");
const User = require("../models/User");
const router = express.Router();

function buildQuery(q, userId) {
  const filter = { userId };

  // Submitted date range
  if (q.submittedFrom || q.submittedTo) {
    const range = {};
    if (q.submittedFrom) {
      range.$gte = new Date(`${q.submittedFrom}T00:00:00.000Z`);
    }
    if (q.submittedTo) {
      // make end exclusive by adding 1 day
      const end = new Date(`${q.submittedTo}T00:00:00.000Z`);
      range.$lt = new Date(end.getTime() + 86400000);
    }
    filter.dateSubmittedIso = range;
  }

  // Doctor / Insurance / Claim
  if (q.doctor) filter.doctor = q.doctor;
  if (q.insurance) filter.insurance = q.insurance;
  if (q.claimNo) filter.claimNo = new RegExp(q.claimNo, "i");

  // CPT code present in any line
  if (q.cpt) filter["cpts.code"] = q.cpt;

  // Manual workflow status (optional)
  if (q.workflowStatus) filter.workflowStatus = q.workflowStatus;

  return filter;
}

function toWideRow(docWithPhase) {
  const doc = docWithPhase;
  const submittedIso = doc.dateSubmittedIso
    ? new Date(doc.dateSubmittedIso).toISOString()
    : "";
  const dueIso = doc.dueDateIso ? new Date(doc.dueDateIso).toISOString() : "";

  const patient = doc.patient ?? doc.patientName ?? "";
  const base = {
    submitted_at: submittedIso,
    due_at: dueIso,
    phase: doc.phase || "",
    claim_no: doc.claimNo,
    insurance: doc.insurance,
    doctor: doc.doctor,
    patient,
    billed: doc.totals?.billed ?? 0,
    paid: doc.totals?.paid ?? 0,
    workflow_status: doc.workflowStatus || "",
  };

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

// CREATE
// CREATE + generate & store PDF immediately
// CREATE
router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};

    const submittedAt = body.dateSubmittedIso
      ? new Date(body.dateSubmittedIso)
      : new Date();
    const dueDate = body.dueDateIso
      ? new Date(body.dueDateIso)
      : new Date(submittedAt.getTime() + 30 * 86400000);

    const created = await Submission.create({
      ...body,
      userId: req.user._id,
      dateSubmittedIso: submittedAt,
      dueDateIso: dueDate,
    });

    return res.json({ ok: true, submission: created });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ ok: false, message: err.message });
  }
});

// LIST with filters + computed phase
// GET /api/submissions?submittedFrom=YYYY-MM-DD&submittedTo=YYYY-MM-DD&doctor=...&insurance=...&cpt=...&claimNo=...&phase=Pending|Grace%20Period|Missed|Expired&workflowStatus=...&limit=50
router.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(5000, Number(req.query.limit || 50));
  const filter = buildQuery(req.query, req.user._id);

  const docs = await Submission.find(filter)
    .sort({ dateSubmittedIso: -1 })
    .limit(limit)
    .lean();

  // Compute phase on-the-fly
  const withPhase = docs.map((d) => {
    const { phase, phaseEndIso } = computePhase(d.dueDateIso);
    return { ...d, phase, phaseEndIso };
  });

  // Optional phase filter (string match)
  const wanted = (req.query.phase || "").toLowerCase();
  const items = wanted
    ? withPhase.filter((i) => i.phase.toLowerCase() === wanted)
    : withPhase;

  res.json({ items });
});

// EXPORT CSV with same filters + phase
router.get("/export", requireAuth, async (req, res) => {
  const filter = buildQuery(req.query, req.user._id);

  const docs = await Submission.find(filter)
    .sort({ dateSubmittedIso: -1 })
    .limit(100000)
    .lean();

  const withPhase = docs.map((d) => {
    const { phase, phaseEndIso } = computePhase(d.dueDateIso);
    return { ...d, phase, phaseEndIso };
  });

  const wanted = (req.query.phase || "").toLowerCase();
  const filtered = wanted
    ? withPhase.filter((i) => i.phase.toLowerCase() === wanted)
    : withPhase;

  const wide = filtered.map(toWideRow);
  const csv = toCsv(wide);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="submissions_${Date.now()}.csv"`
  );
  res.send(csv);
});

// POST /api/submissions/:id/pdf  (generate from Google Docs template id passed in body)
router.post("/:id/pdf", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { templateDriveFileId } = req.body || {};
    if (!templateDriveFileId) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing templateDriveFileId" });
    }

    const sub = await Submission.findOne({ _id: id, userId: req.user._id });
    if (!sub) return res.status(404).json({ ok: false, message: "Not found" });

    const user = await User.findById(req.user._id).lean();
    const map = buildTemplateData(sub.toObject ? sub.toObject() : sub, user);
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    // Generate from Google Docs using the *override* template id
    const { pdfBuffer, workingDocId } = await generatePdfFromGoogleDoc(
      sub.toObject ? sub.toObject() : sub,
      user,
      { templateId: templateDriveFileId, dataMap: map }
    );

    // Save to GridFS
    const bucket = getBucket();
    const filename = `negotiation_${sub.claimNo || sub._id}.pdf`;
    const upload = bucket.openUploadStream(filename, {
      contentType: "application/pdf",
      metadata: { submissionId: String(sub._id), userId: String(req.user._id) },
    });
    upload.end(pdfBuffer);
    await new Promise((resolve, reject) => {
      upload.on("finish", resolve);
      upload.on("error", reject);
    });
    sub.pdf = { data: pdfBuffer, contentType: "application/pdf" };
    sub.pdfDriveWorkingDocId = workingDocId;
    sub.pdfCreatedAt = new Date();
    await sub.save();

    await Submission.updateOne(
      { _id: sub._id },
      {
        $set: {
          pdfGridId: upload.id,
          pdfFilename: filename,
          pdfMimeType: "application/pdf",
          pdfCreatedAt: new Date(),
          pdfDriveWorkingDocId: workingDocId,
        },
      }
    );

    return res.json({
      ok: true,
      url: `/api/submissions/${sub._id}/pdf`,
      filename: `negotiation_${sub.claimNo || sub._id}.pdf`,
    });
  } catch (err) {
    console.error("Generate PDF error:", err);
    const msg = err?.message || "PDF generation failed";
    return res.status(500).json({ ok: false, message: msg });
  }
});

// GET /api/submissions/:id/pdf  (download the stored PDF from GridFS)
router.get("/:id/pdf", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await Submission.findOne({ _id: id, userId: req.user._id });
    if (!sub)
      return res
        .status(404)
        .json({ ok: false, message: "Submission not found" });

    if (!sub.pdfGridId) {
      return res
        .status(404)
        .json({ ok: false, message: "No PDF generated yet" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${(sub.pdfFilename || "negotiation.pdf").replace(
        /"/g,
        ""
      )}"`
    );

    const bucket = getBucket();
    const stream = bucket.openDownloadStream(sub.pdfGridId);
    stream.on("error", (e) => {
      console.error("GridFS download error:", e);
      res.status(500).end();
    });
    stream.pipe(res);
  } catch (err) {
    console.error("Download PDF error:", err);
    res.status(500).json({ ok: false, message: "Download failed" });
  }
});
function insurerEmailFor(name) {
  // TODO: replace with real mapping; for now always your test inbox
  return process.env.TEST_INSURANCE_EMAIL || "josephpagnotta123@gmail.com";
}

router.post("/:id/email", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await Submission.findOne({ _id: id, userId: req.user._id });
    if (!sub) return res.status(404).json({ ok: false, message: "Not found" });
    if (!sub.pdfGridId)
      return res
        .status(400)
        .json({ ok: false, message: "No PDF generated for this submission" });

    // Load PDF from GridFS
    const bucket = getBucket();
    const chunks = [];
    await new Promise((resolve, reject) => {
      bucket
        .openDownloadStream(sub.pdfGridId)
        .on("data", (c) => chunks.push(c))
        .on("end", resolve)
        .on("error", reject);
    });
    const pdf = Buffer.concat(chunks);

    // Gmail send as the user
    const user = await User.findById(req.user._id);
    const client = await getAuthedClientForUser(user);

    await sendGmailWithAttachment(client, {
      to: insurerEmailFor(sub.insurance),
      subject: `Open Negotiation Claim ${sub.claimNo || sub._id}`,
      text: `Please find attached our negotiation request for claim ${
        sub.claimNo || sub._id
      }.`,
      filename: sub.pdfFilename || "negotiation.pdf",
      data: pdf,
    });

    await Submission.updateOne(
      { _id: sub._id },
      { $set: { emailedAt: new Date() } }
    );
    res.json({ ok: true, message: "Email sent" });
  } catch (err) {
    console.error("Send email error:", err);
    const m = err?.message || "Send failed";
    res.status(500).json({ ok: false, message: m });
  }
});

module.exports = router;

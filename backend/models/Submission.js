// backend/models/Submission.js
const mongoose = require("mongoose");

const CPTLineSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    count: { type: Number, required: true, default: 1 },
    initialPayment: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const TotalsSchema = new mongoose.Schema(
  {
    paid: { type: Number, default: 0 },
    billed: { type: Number, default: 0 },
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Identifiers
    claimNo: { type: String, required: true, index: true },
    insurance: { type: String, required: true, index: true },
    doctor: { type: String, required: true, index: true },

    // Patient info (names may vary in your db; keep both if you already use "patient")
    patientName: { type: String },
    patient: { type: String }, // keep if you've already inserted docs with "patient"

    // Service
    dateOfService: { type: String }, // keep as string if that's what you current records use

    // CPTs
    cpts: {
      type: [CPTLineSchema],
      validate: (v) => Array.isArray(v) && v.length > 0 && v.length <= 7,
      required: true,
    },

    // Financials
    totals: {
      billed: { type: Number, required: true, default: 0 },
      paid: { type: Number, required: true, default: 0 },
    },

    // Dates (store as Date for proper range queries)
    dateSubmittedIso: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    dueDateIso: { type: Date, required: true, index: true },

    // Optional human workflow status (separate from time-based "phase")
    workflowStatus: {
      type: String,
      enum: ["submitted", "in_review", "resolved", "rejected"],
      default: "submitted",
      index: true,
    },

    notes: { type: String },
    // NEW: PDF storage (GridFS)
    pdfGridId: { type: require("mongoose").Schema.Types.ObjectId },
    pdfFilename: { type: String },
    pdfMimeType: { type: String },
    pdfCreatedAt: { type: Date },
    pdfDriveWorkingDocId: { type: String },
    emailedAt: { type: Date },
  },
  { timestamps: true }
);

const Submission = mongoose.model("Submission", SubmissionSchema);
module.exports = Submission;

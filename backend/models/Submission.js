const mongoose = require("mongoose");

const CPTLineSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    count: { type: Number, required: true },
    initialPayment: { type: Number, required: true },
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // internal ID (uppercase)
    claimNo: { type: String, required: true },
    patient: { type: String, required: true },
    insurance: { type: String, required: true },
    providerAccountNo: { type: String, required: true },
    doctor: { type: String, required: true },
    dateOfService: { type: String, required: true }, // yyyy-MM-dd
    submitterEmail: { type: String, required: true },
    cpts: {
      type: [CPTLineSchema],
      validate: (v) => v.length > 0 && v.length <= 7,
    },
    totals: {
      paid: { type: Number, required: true },
      billed: { type: Number, required: true },
    },
    dateSubmittedIso: { type: Date, required: true, index: true },
    dueDateIso: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["submitted", "emailed", "followup_queued", "done"],
      default: "submitted",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", SubmissionSchema);

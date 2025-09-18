const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },

    // New profile fields for PDF population
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true }, // keep as string to preserve formatting
    mailingAddress: { type: String, required: true, trim: true }, // single freeform line for now

    googleAuth: {
      access_token: { type: String, default: "" },
      refresh_token: { type: String, default: "" }, // required for server-side Drive/Docs
      scope: { type: String, default: "" },
      token_type: { type: String, default: "Bearer" },
      expiry_date: { type: Number, default: null },
    },
    templateGoogleDocId: { type: String, default: "" }, // the Google Doc template id
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);

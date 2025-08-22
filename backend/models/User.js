const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      required: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["staff", "admin"], default: "staff" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);

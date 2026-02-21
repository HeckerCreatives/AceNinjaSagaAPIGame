// models/PurchaseReceipt.js
const mongoose = require("mongoose");

const PurchaseReceiptSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    packageName: { type: String, required: true },
    productType: { type: String, required: true, enum: ["inapp", "subs"] },

    // What the client sends
    productId: { type: String },         // required for inapp; optional for subs (we’ll still store it)
    purchaseToken: { type: String, required: true, unique: true, index: true },

    // Google verification snapshot
    google: { type: Object, default: {} },

    // Processing status
    status: {
      type: String,
      required: true,
      enum: ["received", "verified", "granted", "rejected"],
      default: "received",
      index: true,
    },

    // What we granted
    grant: {
      type: Object,
      default: null,
    },

    // Anti-replay / audit
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

const PurchaseReceipt =  mongoose.model("PurchaseReceipt", PurchaseReceiptSchema);

module.exports = PurchaseReceipt
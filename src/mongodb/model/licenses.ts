import mongoose from "mongoose";

const LicensesSchema = new mongoose.Schema(
  {
    // id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    productId: { type: String, require: true },
    status: { type: String, required: true },
    modifyDateActivated: { type: String },
    activationDays: { type: Number },
    expiresAt: { type: String },
    currentPlan: { type: String },
    currentPrice: { type: String },
    historyLicenseBough: [{ type: String }],
    toolName: { type: String, required: true },
    category: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    note: { type: String },
    options: { type: Object },
    // creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

const LicensesModel = mongoose.model("Licenses", LicensesSchema);

export default LicensesModel;

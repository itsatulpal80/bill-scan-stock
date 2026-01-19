import mongoose from "mongoose";

const BatchSchema = new mongoose.Schema(
  {
    batchNumber: String,
    expiryDate: String, // YYYY-MM
    purchaseRate: Number,
    mrp: Number,
    quantity: Number,
    distributor: String,
  },
  { timestamps: true }
);

const MedicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    batches: [BatchSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Medicine", MedicineSchema);

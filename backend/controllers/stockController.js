// controllers/stockController.js
import Medicine from "../models/Medicine.js";

/* =================================
   POST: Manual Stock Entry
   ================================= */
export const addManualStock = async (req, res) => {
  try {
    const {
      medicineName,
      batchNumber,
      expiry,
      purchaseRate,
      mrp,
      quantity,
      distributor,
    } = req.body;

    if (!medicineName || !distributor) {
      return res.status(400).json({
        success: false,
        message: "Medicine name and distributor are required",
      });
    }

    let medicine = await Medicine.findOne({
      name: new RegExp(`^${medicineName}$`, "i"),
    });

    if (!medicine) {
      medicine = new Medicine({
        name: medicineName,
        batches: [],
      });
    }

    medicine.batches.push({
      batchNumber,
      expiryDate: expiry,
      purchaseRate,
      mrp,
      quantity,
      distributor,
    });

    await medicine.save();

    res.json({
      success: true,
      message: "Stock added successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =================================
   GET: All Stock
   ================================= */
export const getAllStock = async (req, res) => {
  try {
    const medicines = await Medicine.find();

    const data = medicines.map((m) => ({
      id: m._id,
      name: m.name,
      totalQuantity: m.batches.reduce((s, b) => s + b.quantity, 0),
      batches: m.batches,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =================================
   GET: Distributor-wise Stock
   ================================= */
export const getStockByDistributor = async (req, res) => {
  try {
    const medicines = await Medicine.find();
    const map = {};

    medicines.forEach((m) => {
      m.batches.forEach((b) => {
        if (!map[b.distributor]) {
          map[b.distributor] = {
            distributor: b.distributor,
            totalUnits: 0,
            medicines: [],
          };
        }

        map[b.distributor].totalUnits += b.quantity;

        const existing = map[b.distributor].medicines.find(
          (x) => x.name === m.name
        );

        if (existing) {
          existing.quantity += b.quantity;
        } else {
          map[b.distributor].medicines.push({
            medicineId: m._id,
            name: m.name,
            quantity: b.quantity,
          });
        }
      });
    });

    res.json({
      success: true,
      data: Object.values(map),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

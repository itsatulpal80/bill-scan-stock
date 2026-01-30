// controllers/stockController.js
import { ObjectId } from 'mongodb';
import { getDb } from '../models/db.js';

/* =================================================
   POST /stock/manual
   Manual stock entry (UI modal ke fields ke hisaab se)
   ================================================= */
export async function manualAddStock(req, res) {
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

    if (!medicineName || !distributor || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'medicineName, distributor and quantity are required',
      });
    }

    const db = getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database not connected',
      });
    }

    const medicinesCol = db.collection('medicines');

    // Case-insensitive medicine search
    let medicine = await medicinesCol.findOne({
      name: { $regex: `^${medicineName}$`, $options: 'i' },
    });

    const batch = {
      _id: new ObjectId(),
      batchNumber: batchNumber || null,
      expiryDate: expiry || null,
      purchaseRate: Number(purchaseRate || 0),
      mrp: Number(mrp || 0),
      quantity: Number(quantity),
      distributor,
      createdAt: new Date(),
    };

    if (!medicine) {
      await medicinesCol.insertOne({
        name: medicineName,
        batches: [batch],
        createdAt: new Date(),
      });
    } else {
      await medicinesCol.updateOne(
        { _id: medicine._id },
        { $push: { batches: batch } }
      );
    }

    res.json({
      success: true,
      message: 'Stock added successfully',
    });
  } catch (err) {
    console.error('manualAddStock error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
}

/* =================================================
   GET /stock
   All Stock (All Stock tab)
   ================================================= */
export async function listAllStock(req, res) {
  try {
    const db = getDb();
    const medicinesCol = db.collection('medicines');

    const medicines = await medicinesCol.find({}).toArray();

    const data = medicines.map((m) => ({
      id: m._id,
      name: m.name,
      totalQuantity: (m.batches || []).reduce(
        (sum, b) => sum + Number(b.quantity || 0),
        0
      ),
      batches: m.batches || [],
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('listAllStock error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   GET /stock/distributors
   Distributor summary list
   ================================================= */
export async function listDistributors(req, res) {
  try {
    const db = getDb();
    const medicines = await db.collection('medicines').find({}).toArray();

    const map = {};

    medicines.forEach((m) => {
      (m.batches || []).forEach((b) => {
        if (!map[b.distributor]) {
          map[b.distributor] = {
            distributor: b.distributor,
            count: 0,
            total: 0,
          };
        }
        map[b.distributor].count += 1;
        map[b.distributor].total += Number(b.quantity || 0);
      });
    });

    res.json({
      success: true,
      distributors: Object.values(map),
    });
  } catch (err) {
    console.error('listDistributors error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   GET /stock/distributor/:name
   Distributor-wise medicines
   ================================================= */
export async function getByDistributor(req, res) {
  try {
    const name = decodeURIComponent(req.params.name);
    const db = getDb();
    const medicines = await db.collection('medicines').find({}).toArray();

    const batches = [];

    medicines.forEach((m) => {
      (m.batches || []).forEach((b) => {
        if (b.distributor === name) {
          batches.push({
            medicineId: m._id,
            medicineName: m.name,
            ...b,
          });
        }
      });
    });

    res.json({
      success: true,
      batches,
    });
  } catch (err) {
    console.error('getByDistributor error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   PUT /stock/distributor
   Rename distributor
   ================================================= */
export async function renameDistributor(req, res) {
  try {
    const { oldName, newName } = req.body;
    const db = getDb();

    await db.collection('medicines').updateMany(
      { 'batches.distributor': oldName },
      { $set: { 'batches.$[b].distributor': newName } },
      { arrayFilters: [{ 'b.distributor': oldName }] }
    );

    res.json({ success: true, message: 'Distributor renamed' });
  } catch (err) {
    console.error('renameDistributor error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

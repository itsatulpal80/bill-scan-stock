// controllers/stockController.js
import { ObjectId } from 'mongodb';
import { getDb } from '../models/db.js';

/* =================================================
   GET /stock/alerts/expired
   Get expired medicines
   ================================================= */
export async function getExpiredMedicines(req, res) {
  try {
    const db = getDb();
    const today = new Date();
    const medicines = await db.collection('medicines').find({}).toArray();

    const expired = [];
    medicines.forEach((m) => {
      (m.batches || []).forEach((b) => {
        if (b.expiryDate) {
          const [year, month] = b.expiryDate.split('-');
          const expiryDate = new Date(`${year}-${month}-01`);
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          expiryDate.setDate(0); // last day of month
          if (expiryDate < today) {
            expired.push({
              medicineId: m._id.toString(),
              medicineName: m.name,
              batchNumber: b.batchNumber,
              expiryDate: b.expiryDate,
              quantity: b.quantity,
              distributor: b.distributor,
              alertType: 'expired',
            });
          }
        }
      });
    });

    res.json({ success: true, data: expired });
  } catch (err) {
    console.error('getExpiredMedicines error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   GET /stock/alerts/expiring-soon
   Get medicines expiring within 3 months
   ================================================= */
export async function getExpiringMedicines(req, res) {
  try {
    const db = getDb();
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const medicines = await db.collection('medicines').find({}).toArray();

    const expiring = [];
    medicines.forEach((m) => {
      (m.batches || []).forEach((b) => {
        if (b.expiryDate) {
          const [year, month] = b.expiryDate.split('-');
          const expiryDate = new Date(`${year}-${month}-01`);
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          expiryDate.setDate(0); // last day of month
          if (expiryDate > today && expiryDate <= threeMonthsLater) {
            expiring.push({
              medicineId: m._id.toString(),
              medicineName: m.name,
              batchNumber: b.batchNumber,
              expiryDate: b.expiryDate,
              quantity: b.quantity,
              distributor: b.distributor,
              alertType: 'expiring_soon',
            });
          }
        }
      });
    });

    res.json({ success: true, data: expiring });
  } catch (err) {
    console.error('getExpiringMedicines error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   GET /stock/alerts/low-stock
   Get medicines with quantity < 3
   ================================================= */
export async function getLowStockMedicines(req, res) {
  try {
    const db = getDb();
    const medicines = await db.collection('medicines').find({}).toArray();

    const lowStock = [];
    medicines.forEach((m) => {
      const totalQty = (m.batches || []).reduce((sum, b) => sum + Number(b.quantity || 0), 0);
      if (totalQty < 3 && totalQty > 0) {
        lowStock.push({
          medicineId: m._id.toString(),
          medicineName: m.name,
          currentQuantity: totalQty,
          alertType: 'low_stock',
        });
      }
    });

    res.json({ success: true, data: lowStock });
  } catch (err) {
    console.error('getLowStockMedicines error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   GET /stock/alerts/summary
   Get alert counts for dashboard
   ================================================= */
export async function getAlertsSummary(req, res) {
  try {
    const db = getDb();
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const medicines = await db.collection('medicines').find({}).toArray();

    let expiredCount = 0, expiringCount = 0, lowStockCount = 0;

    medicines.forEach((m) => {
      const totalQty = (m.batches || []).reduce((sum, b) => sum + Number(b.quantity || 0), 0);
      if (totalQty < 3 && totalQty > 0) lowStockCount++;

      (m.batches || []).forEach((b) => {
        if (b.expiryDate) {
          const [year, month] = b.expiryDate.split('-');
          const expiryDate = new Date(`${year}-${month}-01`);
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          expiryDate.setDate(0);
          if (expiryDate < today) expiredCount++;
          else if (expiryDate <= threeMonthsLater) expiringCount++;
        }
      });
    });

    res.json({ 
      success: true, 
      data: { 
        expiredCount, 
        expiringCount, 
        lowStockCount,
        totalAlerts: expiredCount + expiringCount + lowStockCount
      } 
    });
  } catch (err) {
    console.error('getAlertsSummary error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

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
      _id: m._id.toString(),
      name: m.name,
      totalQuantity: (m.batches || []).reduce(
        (sum, b) => sum + Number(b.quantity || 0),
        0
      ),
      batches: (m.batches || []).map((b) => ({
        _id: b._id ? String(b._id) : undefined,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        purchaseRate: b.purchaseRate,
        mrp: b.mrp,
        quantity: Number(b.quantity || 0),
        distributor: b.distributor,
        createdAt: b.createdAt,
      })),
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

/* =================================================
   PUT /stock/medicine/:id
   Update medicine name
   ================================================= */
export async function editMedicineName(req, res) {
  try {
    const id = req.params.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });

    const db = getDb();
    await db.collection('medicines').updateOne(
      { _id: new ObjectId(id) },
      { $set: { name } }
    );

    res.json({ success: true, message: 'Medicine updated' });
  } catch (err) {
    console.error('editMedicineName error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   DELETE /stock/medicine/:id
   Delete whole medicine (all batches)
   ================================================= */
export async function deleteMedicine(req, res) {
  try {
    const id = req.params.id;
    const db = getDb();
    await db.collection('medicines').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (err) {
    console.error('deleteMedicine error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   PUT /stock/batch/:id
   Update a batch by its _id
   ================================================= */
export async function editBatch(req, res) {
  try {
    const batchId = req.params.id;
    const updates = req.body || {};
    const db = getDb();

    const setObj = {};
    if (updates.batchNumber !== undefined) setObj['batches.$.batchNumber'] = updates.batchNumber;
    if (updates.expiryDate !== undefined) setObj['batches.$.expiryDate'] = updates.expiryDate;
    if (updates.purchaseRate !== undefined) setObj['batches.$.purchaseRate'] = Number(updates.purchaseRate || 0);
    if (updates.mrp !== undefined) setObj['batches.$.mrp'] = Number(updates.mrp || 0);
    if (updates.quantity !== undefined) setObj['batches.$.quantity'] = Number(updates.quantity || 0);
    if (updates.distributor !== undefined) setObj['batches.$.distributor'] = updates.distributor;

    if (Object.keys(setObj).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await db.collection('medicines').updateOne(
      { 'batches._id': new ObjectId(batchId) },
      { $set: setObj }
    );

    res.json({ success: true, message: 'Batch updated' });
  } catch (err) {
    console.error('editBatch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   DELETE /stock/batch/:id
   Remove a single batch
   ================================================= */
export async function deleteBatch(req, res) {
  try {
    const batchId = req.params.id;
    const db = getDb();
    await db.collection('medicines').updateOne(
      { 'batches._id': new ObjectId(batchId) },
      { $pull: { batches: { _id: new ObjectId(batchId) } } }
    );
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    console.error('deleteBatch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =================================================
   DELETE /stock
   Delete ALL stock (use with caution)
   ================================================= */
export async function deleteAllStock(req, res) {
  try {
    const db = getDb();
    await db.collection('medicines').deleteMany({});
    res.json({ success: true, message: 'All stock cleared' });
  } catch (err) {
    console.error('deleteAllStock error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

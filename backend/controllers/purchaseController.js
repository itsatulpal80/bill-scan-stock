import { connectDb, getDb } from '../models/db.js';
import { info, error } from '../utils/logger.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function handlePurchase(req, res) {
  try {
    const { items, invoice } = req.body || {};
    if (!items || !Array.isArray(items)) return res.status(400).json({ success: false, error: 'items array required' });

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) return res.status(500).json({ success: false, error: 'MONGODB_URI not configured on server' });
    await connectDb(MONGODB_URI);
    const db = getDb();
    const medicinesCol = db.collection('medicines');
    const batchesCol = db.collection('batches');
    const invoicesCol = db.collection('purchase_invoices');

    const invoiceDoc = {
      invoice_number: invoice?.invoiceNumber || invoice?.invoice_number || null,
      invoice_date: invoice?.invoiceDate || invoice?.invoice_date || null,
      supplier_name: invoice?.supplierName || invoice?.supplier_name || null,
      total_amount: items.reduce((s, it) => s + (Number(it.purchaseRate || 0) * Number(it.quantity || 0)), 0),
      created_at: new Date(),
    };

    const invoiceRes = await invoicesCol.insertOne(invoiceDoc);
    let itemsInserted = 0;
    for (const it of items) {
      const name = (it.medicineName || '').trim();
      if (!name) continue;

      const existing = await medicinesCol.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } });
      let medicineId;
      if (existing) medicineId = existing._id;
      else {
        const med = { name, manufacturer: it.manufacturer || null, category: it.category || null, gst_rate: it.gstRate || 12, is_active: true, created_at: new Date() };
        const r = await medicinesCol.insertOne(med);
        medicineId = r.insertedId;
      }

      const batch = {
        medicine_id: medicineId,
        batch_number: it.batchNumber || null,
        expiry_date: it.expiryDate || null,
        purchase_rate: Number(it.purchaseRate || 0),
        mrp: Number(it.mrp || 0),
        quantity: Number(it.quantity || 0),
        purchase_invoice_id: invoiceRes.insertedId,
        created_at: new Date(),
      };
      await batchesCol.insertOne(batch);
      itemsInserted += 1;
    }

    info('Purchase saved', { invoiceId: invoiceRes.insertedId.toString(), itemsInserted });
    return res.json({ success: true, inserted: itemsInserted, invoiceId: invoiceRes.insertedId.toString() });
  } catch (err) {
    error('Purchase save error', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to save purchase' });
  }
}

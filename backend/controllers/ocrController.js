import { connectDb, getDb } from "../models/db.js";
import { info, error } from "../utils/logger.js";
import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * IMPORTANT:
 * - We DO NOT rely on PATH
 * - We DO NOT rely on npm tesseract.js
 * - We ALWAYS use full executable path
 */
const TESSERACT_CMD =
  process.env.TESSERACT_CMD ||
  "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";

/**
 * Escape regex helper
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Run system Tesseract OCR safely
 */
async function runLocalOcr(imageBase64) {
  const b64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  const imageBuffer = Buffer.from(b64, "base64");

  const tmpFile = path.join(
    os.tmpdir(),
    `bill-ocr-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
  );

  await fs.writeFile(tmpFile, imageBuffer);

  try {
    const text = await new Promise((resolve, reject) => {
      execFile(
        TESSERACT_CMD,
        [tmpFile, "stdout", "-l", "eng"],
        { maxBuffer: 10 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) return reject(stderr || err);
          resolve(stdout);
        }
      );
    });

    return text;
  } finally {
    // cleanup temp file
    fs.unlink(tmpFile).catch(() => {});
  }
}

/**
 * Very lightweight rule-based invoice parser
 */
function parseTextToInvoice(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed = {
    invoiceNumber: null,
    invoiceDate: null,
    supplierName: null,
    items: [],
  };

  // Invoice number
  for (const l of lines) {
    const m = l.match(/invoice\s*(?:no|number|#)?[:\s]*([A-Z0-9\-\/]+)/i);
    if (m) {
      parsed.invoiceNumber = m[1];
      break;
    }
  }

  // Invoice date
  for (const l of lines) {
    const m = l.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    if (m) {
      parsed.invoiceDate = m[1];
      break;
    }
  }

  // Supplier name (top lines heuristic)
  for (const l of lines.slice(0, 5)) {
    if (/invoice|bill|tax|gst|date/i.test(l)) continue;
    parsed.supplierName = l;
    break;
  }

  // Item rows
  for (const l of lines) {
    if (/total|subtotal|gst|tax|amount|invoice/i.test(l)) continue;

    const nums = l.match(/\d+[.,]?\d*/g);
    if (!nums || nums.length < 2) continue;

    const cleaned = nums.map((n) => Number(n.replace(/,/g, "")));
    const quantity = Math.round(cleaned[cleaned.length - 1] || 0);
    const purchaseRate =
      cleaned.length >= 2 ? cleaned[cleaned.length - 2] : 0;
    const mrp =
      cleaned.length >= 3 ? cleaned[cleaned.length - 3] : purchaseRate;

    const nameMatch = l.match(/^(.*?)(?=\d)/);
    const medicineName = nameMatch ? nameMatch[1].trim() : l;

    parsed.items.push({
      medicineName: medicineName || "unknown",
      manufacturer: null,
      batchNumber: null,
      expiryDate: null,
      purchaseRate: Number(purchaseRate || 0),
      mrp: Number(mrp || 0),
      quantity: Number(quantity || 0),
      gstRate: 12,
    });
  }

  return parsed;
}

/**
 * MAIN OCR HANDLER
 */
export async function handleOcr(req, res) {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res
        .status(400)
        .json({ success: false, error: "imageBase64 required" });
    }

    // 1️⃣ Run local OCR (NO AI)
    let rawText;
    try {
      rawText = await runLocalOcr(imageBase64);
      info("Local OCR success");
    } catch (ocrErr) {
      error("Local OCR failed", ocrErr);
      return res.status(500).json({
        success: false,
        error:
          "Local OCR failed. Ensure Tesseract is installed and TESSERACT_CMD is correct.",
      });
    }

    // 2️⃣ Parse OCR text
    const parsed = parseTextToInvoice(rawText);

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return res.status(422).json({
        success: false,
        error: "No medicine items detected",
        rawText,
      });
    }

    // 3️⃣ Save to MongoDB (optional)
    let saved = { invoiceId: null, itemsInserted: 0 };

    if (process.env.MONGODB_URI) {
      await connectDb(process.env.MONGODB_URI);
      const db = getDb();

      const medicinesCol = db.collection("medicines");
      const batchesCol = db.collection("batches");
      const invoicesCol = db.collection("purchase_invoices");

      const invoiceRes = await invoicesCol.insertOne({
        invoice_number: parsed.invoiceNumber,
        invoice_date: parsed.invoiceDate,
        supplier_name: parsed.supplierName,
        created_at: new Date(),
      });

      saved.invoiceId = invoiceRes.insertedId.toString();

      for (const it of parsed.items) {
        if (!it.medicineName) continue;

        const existing = await medicinesCol.findOne({
          name: { $regex: `^${escapeRegex(it.medicineName)}$`, $options: "i" },
        });

        const medicineId =
          existing?._id ||
          (await medicinesCol.insertOne({
            name: it.medicineName,
            manufacturer: it.manufacturer,
            gst_rate: it.gstRate || 12,
            created_at: new Date(),
          })).insertedId;

        await batchesCol.insertOne({
          medicine_id: medicineId,
          batch_number: it.batchNumber,
          expiry_date: it.expiryDate,
          purchase_rate: it.purchaseRate,
          mrp: it.mrp,
          quantity: it.quantity,
          purchase_invoice_id: invoiceRes.insertedId,
          created_at: new Date(),
        });

        saved.itemsInserted++;
      }
    }

    info("OCR completed", saved);

    return res.json({
      success: true,
      data: parsed,
      saved,
    });
  } catch (err) {
    error("OCR handler crash", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

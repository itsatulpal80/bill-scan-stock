import {
  callGoogleGenerative,
  callOpenAI,
  extractContentFromAIResponse,
} from "../services/aiService.js";
import { connectDb, getDb } from "../models/db.js";
import { info, error } from "../utils/logger.js";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function handleOcr(req, res, options = {}) {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64)
      return res.status(400).json({ success: false, error: "imageBase64 required" });

    const systemPrompt =
      options.systemPrompt ||
      `You are an OCR specialist for Indian pharmacy purchase bills.
Return STRICT VALID JSON only.

Schema:
{
  invoiceNumber: string|null,
  invoiceDate: string|null,
  supplierName: string|null,
  items: [{
    medicineName: string,
    manufacturer: string|null,
    batchNumber: string|null,
    expiryDate: string|null,
    purchaseRate: number,
    mrp: number,
    quantity: number,
    gstRate: number
  }]
}`;

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_MODEL = process.env.GOOGLE_MODEL;

    if (!OPENAI_KEY && !GOOGLE_API_KEY) {
      return res
        .status(500)
        .json({ success: false, error: "AI not configured" });
    }

    let aiData;
    try {
      if (OPENAI_KEY) {
        aiData = await callOpenAI(
          OPENAI_MODEL,
          OPENAI_KEY,
          imageBase64,
          systemPrompt
        );
      } else {
        aiData = await callGoogleGenerative(
          GOOGLE_MODEL,
          GOOGLE_API_KEY,
          systemPrompt
        );
      }
    } catch (err) {
      error("AI call failed", err);
      return res
        .status(500)
        .json({ success: false, error: err.message });
    }

    const content = extractContentFromAIResponse(aiData);

    let parsed;
    try {
      const jsonMatch =
        content.match(/```(?:json)?\s*([\s\S]*?)```/) || [];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch (err) {
      error("JSON parse failed", content);
      return res.status(422).json({
        success: false,
        error: "Invalid JSON from AI",
        raw: content,
      });
    }

    if (!Array.isArray(parsed.items)) {
      return res
        .status(422)
        .json({ success: false, error: "Items not extracted" });
    }

    // ✅ Mongo save (UNCHANGED LOGIC)
    let saved = { invoiceId: null, itemsInserted: 0 };
    if (process.env.MONGODB_URI) {
      await connectDb(process.env.MONGODB_URI);
      const db = getDb();

      const medicinesCol = db.collection("medicines");
      const batchesCol = db.collection("batches");
      const invoicesCol = db.collection("purchase_invoices");

      const invoiceRes = await invoicesCol.insertOne({
        invoice_number: parsed.invoiceNumber || null,
        invoice_date: parsed.invoiceDate || null,
        supplier_name: parsed.supplierName || null,
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
            manufacturer: it.manufacturer || null,
            gst_rate: it.gstRate || 12,
            created_at: new Date(),
          })).insertedId;

        await batchesCol.insertOne({
          medicine_id: medicineId,
          batch_number: it.batchNumber || null,
          expiry_date: it.expiryDate || null,
          purchase_rate: Number(it.purchaseRate || 0),
          mrp: Number(it.mrp || 0),
          quantity: Number(it.quantity || 0),
          purchase_invoice_id: invoiceRes.insertedId,
          created_at: new Date(),
        });

        saved.itemsInserted++;
      }
    }

    info("OCR success", saved);
    return res.json({ success: true, data: parsed, saved });
  } catch (err) {
    error("OCR handler crash", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

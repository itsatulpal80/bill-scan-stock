import { callGoogleGenerative, callOpenAI, extractContentFromAIResponse } from '../services/aiService.js';
import { connectDb, getDb } from '../models/db.js';
import { info, error } from '../utils/logger.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function handleOcr(req, res, options = {}) {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ success: false, error: 'imageBase64 required' });

    const systemPrompt = options.systemPrompt || `You are an OCR specialist for Indian pharmacy purchase bills/invoices.\nExtract structured data from medicine purchase bills/invoices.`;

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'google/gemini-2.5-flash';

    if (!OPENAI_KEY && !GOOGLE_API_KEY) return res.status(500).json({ success: false, error: 'AI service not configured (set OPENAI_API_KEY or GOOGLE_API_KEY)' });

    const promptText = `${systemPrompt}\n\nUser instruction: Extract all medicine details from this pharmacy purchase bill/invoice image. Return valid JSON only.\nIMAGE_DATA:${imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`}`;

    let aiRes;
    try {
      if (OPENAI_KEY) aiRes = await callOpenAI(OPENAI_MODEL, OPENAI_KEY, promptText);
      else aiRes = await callGoogleGenerative(GOOGLE_MODEL, GOOGLE_API_KEY, promptText);
    } catch (err) {
      error('AI call exception', err);
      return res.status(500).json({ success: false, error: 'AI service call failed', rawError: err instanceof Error ? err.message : String(err) });
    }

    if (!aiRes.ok) {
      const txt = await aiRes.text().catch(() => '<no-text>');
      error('AI gateway error', aiRes.status, txt);
      if (aiRes.status === 429) return res.status(429).json({ success: false, error: 'Rate limit exceeded', rawContent: txt });
      if (aiRes.status === 402) return res.status(402).json({ success: false, error: 'AI service quota exceeded', rawContent: txt });
      return res.status(500).json({ success: false, error: 'Failed to process image with AI', rawContent: txt });
    }

    const aiData = await aiRes.json().catch((e) => {
      const raw = '<invalid-json-response>';
      error('Failed to parse AI JSON', e);
      throw new Error('Invalid JSON from AI');
    });
    const content = extractContentFromAIResponse(aiData);

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      error('Failed to parse AI response', content);
      return res.status(422).json({ success: false, error: 'Failed to parse extracted data', rawContent: content });
    }

    if (!parsed.items || !Array.isArray(parsed.items)) {
      return res.status(422).json({ success: false, error: 'Could not extract items' });
    }

    let saved = { invoiceId: null, itemsInserted: 0 };
    const MONGODB_URI = process.env.MONGODB_URI;
    if (MONGODB_URI) {
      await connectDb(MONGODB_URI);
      const db = getDb();
      const medicinesCol = db.collection('medicines');
      const batchesCol = db.collection('batches');
      const invoicesCol = db.collection('purchase_invoices');

      const invoiceDoc = {
        invoice_number: parsed.invoiceNumber || null,
        invoice_date: parsed.invoiceDate || null,
        supplier_name: parsed.supplierName || null,
        total_amount: parsed.items.reduce((s, it) => s + (Number(it.purchaseRate || 0) * Number(it.quantity || 0)), 0),
        created_at: new Date(),
      };

      const invoiceRes = await invoicesCol.insertOne(invoiceDoc);
      saved.invoiceId = invoiceRes.insertedId.toString();

      for (const it of parsed.items) {
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
        saved.itemsInserted += 1;
      }
    }

    info('OCR parsed', { items: parsed.items.length, saved });
    return res.json({ success: true, data: parsed, saved });
  } catch (err) {
    error('OCR handler error', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
}

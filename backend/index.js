import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'google/gemini-2.5-flash';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

if (!LOVABLE_API_KEY) {
  console.warn('Warning: LOVABLE_API_KEY not set — OCR calls will fail until configured');
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: ALLOWED_ORIGINS === '*' ? '*' : ALLOWED_ORIGINS.split(',') }));

let dbClient;
let db;

async function connectDb() {
  if (!MONGODB_URI) return null;
  dbClient = new MongoClient(MONGODB_URI);
  await dbClient.connect();
  db = dbClient.db();
  console.log('Connected to MongoDB');
  return db;
}

app.get('/', (req, res) => res.json({ ok: true }));

app.post('/ocr', async (req, res) => {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ success: false, error: 'imageBase64 required' });

    // AI prompt (same as previous Deno function)
    const systemPrompt = `You are an OCR specialist for Indian pharmacy purchase bills/invoices.
Extract structured data from medicine purchase bills/invoices.

IMPORTANT: Analyze the image carefully and extract ALL visible medicine entries.

Return a JSON object with this exact structure:
{
  "supplierName": "Distributor/Supplier name from the bill",
  "invoiceNumber": "Invoice/Bill number",
  "invoiceDate": "YYYY-MM-DD format",
  "items": [
    {
      "medicineName": "Full medicine name with strength (e.g., Paracetamol 500mg)",
      "quantity": number,
      "purchaseRate": number,
      "mrp": number,
      "batchNumber": "Batch/Lot number",
      "expiryDate": "YYYY-MM format",
      "confidence": number
    }
  ]
}`;

    let aiRes;
    if (GOOGLE_API_KEY) {
      // Call Google Generative API (using API key). We'll send the prompt as text
      // and include the image as a data URL in the user instruction (Gemini may accept it).
      const url = `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(GOOGLE_MODEL)}:generate?key=${GOOGLE_API_KEY}`;
      const promptText = `${systemPrompt}\n\nUser instruction: Extract all medicine details from this pharmacy purchase bill/invoice image. Return valid JSON only.\nIMAGE_DATA:${imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`}`;

      aiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: { text: promptText },
          temperature: 0.1,
          max_output_tokens: 4000,
        }),
      });
    } else if (LOVABLE_API_KEY) {
      aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GOOGLE_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract all medicine details from this pharmacy purchase bill/invoice image. Return valid JSON only.' },
                { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
              ],
            }
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });
    } else {
      return res.status(500).json({ success: false, error: 'AI service not configured (set GOOGLE_API_KEY or LOVABLE_API_KEY)' });
    }

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error('AI gateway error', aiRes.status, text);
      if (aiRes.status === 429) return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
      if (aiRes.status === 402) return res.status(402).json({ success: false, error: 'AI service quota exceeded' });
      return res.status(500).json({ success: false, error: 'Failed to process image with AI' });
    }

    const aiData = await aiRes.json();

    // Extract text content from different AI providers
    let content = null;
    // Google Generative API returns `candidates[0].content` or `output[0].content` depending on API version
    if (aiData?.candidates?.[0]?.content) content = aiData.candidates[0].content;
    if (!content && aiData?.output?.[0]?.content) content = aiData.output[0].content;
    if (!content && aiData?.candidates?.[0]?.message) content = aiData.candidates[0].message;
    if (!content && aiData?.choices?.[0]?.message?.content) content = aiData.choices[0].message.content;
    if (!content && typeof aiData?.generated_text === 'string') content = aiData.generated_text;
    if (!content) content = JSON.stringify(aiData);

    // Extract JSON from response
    let ocrResult;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      ocrResult = JSON.parse(jsonStr);
    } catch (err) {
      console.error('Failed to parse AI response', content);
      return res.status(422).json({ success: false, error: 'Failed to parse extracted data', rawContent: content });
    }

    if (!ocrResult.items || !Array.isArray(ocrResult.items)) {
      return res.status(422).json({ success: false, error: 'Could not extract items' });
    }

    // Save to MongoDB if configured
    let saved = { invoiceId: null, itemsInserted: 0 };
    if (MONGODB_URI) {
      if (!db) await connectDb();

      const medicinesCol = db.collection('medicines');
      const batchesCol = db.collection('batches');
      const invoicesCol = db.collection('purchase_invoices');

      const invoiceDoc = {
        invoice_number: ocrResult.invoiceNumber || null,
        invoice_date: ocrResult.invoiceDate || null,
        supplier_name: ocrResult.supplierName || null,
        total_amount: ocrResult.items.reduce((s, it) => s + (Number(it.purchaseRate || 0) * Number(it.quantity || 0)), 0),
        created_at: new Date(),
      };

      const invoiceRes = await invoicesCol.insertOne(invoiceDoc);
      saved.invoiceId = invoiceRes.insertedId.toString();

      for (const it of ocrResult.items) {
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

    return res.json({ success: true, data: ocrResult, saved });
  } catch (error) {
    console.error('OCR endpoint error', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

connectDb().catch((e) => console.warn('DB connect failed:', e));

app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));

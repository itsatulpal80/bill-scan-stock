import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { requestLogger, info, warn } from '../utils/logger.js';

import { handleOcr } from '../controllers/ocrController.js';
import { handlePurchase } from '../controllers/purchaseController.js';
import { signup, login, me } from '../controllers/authController.js';
import { aiTest } from '../controllers/aiTestController.js';

import {
  manualAddStock,
  listDistributors,
  getByDistributor,
  listAllStock,
  editMedicineName,
  deleteMedicine,
  editBatch,
  deleteBatch,
  deleteAllStock,
  renameDistributor,
  getExpiredMedicines,
  getExpiringMedicines,
  getLowStockMedicines,
  getAlertsSummary,
} from '../controllers/stockController.js';

import { connectDb } from '../models/db.js';

dotenv.config();

/* ================= CONFIG ================= */
const MONGODB_URI = process.env.MONGODB_URI;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

/* ================= APP ================= */
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(
  cors({
    origin:
      ALLOWED_ORIGINS === '*'
        ? '*'
        : ALLOWED_ORIGINS.split(','),
    credentials: true,
  })
);

app.use(requestLogger);

/* ================= HEALTH ================= */
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'pharmacy-backend' });
});

/* ================= OCR ================= */
app.post('/ocr', handleOcr);

/* ================= PURCHASE ================= */
app.post('/purchase', handlePurchase);

/* ================= STOCK ================= */
app.post('/stock/manual', manualAddStock);
app.get('/stock', listAllStock);
app.get('/stock/distributors', listDistributors);
app.get('/stock/distributor/:name', getByDistributor);
app.put('/stock/distributor', renameDistributor);
app.put('/stock/medicine/:id', editMedicineName);
app.delete('/stock/medicine/:id', deleteMedicine);
app.put('/stock/batch/:id', editBatch);
app.delete('/stock/batch/:id', deleteBatch);
app.delete('/stock', deleteAllStock);

/* ================= ALERTS ================= */
app.get('/stock/alerts/expired', getExpiredMedicines);
app.get('/stock/alerts/expiring-soon', getExpiringMedicines);
app.get('/stock/alerts/low-stock', getLowStockMedicines);
app.get('/stock/alerts/summary', getAlertsSummary);

/* ================= AUTH ================= */
app.post('/auth/signup', signup);
app.post('/auth/login', login);
app.get('/auth/me', me);

/* ================= AI ================= */
app.get('/ai/test', aiTest);

/* ================= DB ================= */
let dbConnected = false;

async function ensureDb() {
  if (dbConnected || !MONGODB_URI) return;
  await connectDb(MONGODB_URI);
  dbConnected = true;
  info('Connected to MongoDB');
}

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    warn('MongoDB connection failed', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

/* ================= LOCAL DEV ONLY ================= */
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    info(`Server running on http://localhost:${PORT}`);
  });
}

/* ================= EXPORT FOR VERCEL ================= */
export default app;

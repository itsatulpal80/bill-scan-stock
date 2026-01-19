import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { requestLogger, info, warn } from './utils/logger.js';

import { handleOcr } from './controllers/ocrController.js';
import { handlePurchase } from './controllers/purchaseController.js';
import { signup, login, me } from './controllers/authController.js';
import { aiTest } from './controllers/aiTestController.js';

import {
  manualAddStock,
  listDistributors,
  getByDistributor,
  renameDistributor,
  seedTestData,
} from './controllers/stockController.js';

import { connectDb } from './models/db.js';

dotenv.config();

/* ================= CONFIG ================= */
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

if (!process.env.GOOGLE_API_KEY) {
  warn('Warning: GOOGLE_API_KEY not set — OCR will not work');
}

/* ================= APP ================= */
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(
  cors({
    origin: ALLOWED_ORIGINS === '*'
      ? '*'
      : ALLOWED_ORIGINS.split(','),
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
app.post('/stock/manual', manualAddStock);                 // Manual Entry
app.get('/stock/distributors', listDistributors);           // Distributor list
app.get('/stock/distributor/:name', getByDistributor);      // Distributor details
app.put('/stock/distributor', renameDistributor);           // Rename distributor
app.post('/seed-test', seedTestData);                        // Seed demo data

/* ================= AUTH ================= */
app.post('/auth/signup', signup);
app.post('/auth/login', login);
app.get('/auth/me', me);

/* ================= AI ================= */
app.get('/ai/test', aiTest);

/* ================= START ================= */
if (MONGODB_URI) {
  connectDb(MONGODB_URI)
    .then(() => info('✅ Connected to MongoDB'))
    .catch((e) => warn('❌ MongoDB connection failed', e));
} else {
  warn('⚠️ MONGODB_URI not provided — backend will not persist data');
}

app.listen(PORT, () => {
  info(`🚀 Backend listening on port ${PORT}`);
});

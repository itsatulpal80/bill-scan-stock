import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestLogger, info, warn } from './utils/logger.js';
import { handleOcr } from './controllers/ocrController.js';
import { handlePurchase } from './controllers/purchaseController.js';
import { signup, login, me } from './controllers/authController.js';
import { aiTest } from './controllers/aiTestController.js';
import { connectDb } from './models/db.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

if (!process.env.GOOGLE_API_KEY) {
  warn('Warning: GOOGLE_API_KEY not set — OCR calls will fail until configured');
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: ALLOWED_ORIGINS === '*' ? '*' : ALLOWED_ORIGINS.split(',') }));
app.use(requestLogger);

app.get('/', (req, res) => res.json({ ok: true }));

app.post('/ocr', (req, res) => handleOcr(req, res));
app.post('/purchase', (req, res) => handlePurchase(req, res));
app.post('/auth/signup', (req, res) => signup(req, res));
app.post('/auth/login', (req, res) => login(req, res));
app.get('/auth/me', (req, res) => me(req, res));
app.get('/ai/test', (req, res) => aiTest(req, res));

// Connect DB on startup if URI present
if (MONGODB_URI) {
  connectDb(MONGODB_URI).then(() => info('Connected to MongoDB')).catch((e) => warn('DB connect failed:', e));
}

app.listen(PORT, () => info(`Backend listening on ${PORT}`));

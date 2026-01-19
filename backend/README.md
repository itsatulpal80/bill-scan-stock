# Backend for Bill Scan Stock

This backend provides an OCR endpoint and persists scanned purchase invoices, medicines and batches into MongoDB Atlas.

Environment variables (see `.env.example`):
- `PORT` - server port (default 4000)
- `MONGODB_URI` - MongoDB Atlas connection string
- `LOVABLE_API_KEY` - API key for the AI OCR service used in the frontend
- `ALLOWED_ORIGINS` - CORS origins (default `*`)

Requirements: Node 18+ (for global fetch) and npm.

Install and run:

```bash
cd backend
npm install
npm run dev   # or npm start
```

Frontend integration:
- Set `VITE_BACKEND_URL` in the root `.env` to your backend base URL (e.g. `http://localhost:4000`).
- The frontend's OCR call (`supabase.functions.invoke('ocr-bill', ...)`) will use the backend when `VITE_BACKEND_URL` is present.


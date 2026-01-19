import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const model = process.env.GOOGLE_MODEL || 'text-bison-001';

if (!apiKey) {
  console.error('NO_API_KEY');
  process.exit(2);
}

const url = `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(model)}:generate?key=${apiKey}`;

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: { text: "System: reply with 'pong'\nUser: ping" }, temperature: 0.1, max_output_tokens: 512 }),
    });
    console.log('STATUS', res.status);
    const txt = await res.text();
    console.log('BODY:');
    console.log(txt);
  } catch (err) {
    console.error('ERR', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

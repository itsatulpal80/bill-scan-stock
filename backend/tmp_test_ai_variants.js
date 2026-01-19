import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const apiKey = process.env.GOOGLE_API_KEY;
const model = process.env.GOOGLE_MODEL || 'text-bison-001';
if (!apiKey) { console.error('NO_API_KEY'); process.exit(2); }

const variants = [
  { name: 'v1beta2?key', url: `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(model)}:generate?key=${apiKey}`, opts: {} },
  { name: 'v1?key', url: `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generate?key=${apiKey}`, opts: {} },
  { name: 'v1beta2 auth', url: `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(model)}:generate`, opts: { headers: { Authorization: `Bearer ${apiKey}` } } },
  { name: 'v1 auth', url: `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generate`, opts: { headers: { Authorization: `Bearer ${apiKey}` } } },
];

(async () => {
  for (const v of variants) {
    try {
      console.log('\n----', v.name, '----');
      const res = await fetch(v.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(v.opts.headers || {}) },
        body: JSON.stringify({ prompt: { text: "System: reply with 'pong'\\nUser: ping" }, temperature: 0.1, max_output_tokens: 256 }),
      });
      console.log('URL:', v.url.replace(/\?.*$/, '?<redacted_key>'));
      console.log('STATUS', res.status);
      const t = await res.text();
      console.log('BODY:', t ? t.substring(0, 400) : '<empty>');
    } catch (err) {
      console.error('ERR', err.message);
    }
  }
})();

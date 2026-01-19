// Lightweight supabase replacement: only implements `functions.invoke` used by OCR.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

async function invokeFunction(name: string, opts?: { body?: any }) {
  if (!SUPABASE_URL) {
    return { data: null, error: new Error('SUPABASE_URL not configured') };
  }

  // If a dedicated backend URL is provided, route OCR calls there instead
  if (BACKEND_URL && name === 'ocr-bill') {
    const url = `${BACKEND_URL.replace(/\/$/, '')}/ocr`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts?.body ?? {}),
      });
      const json = await res.json();
      return { data: json, error: json?.error ? new Error(json.error) : null };
    } catch (error) {
      return { data: null, error };
    }
  }

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${name}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: SUPABASE_PUBLISHABLE_KEY ? `Bearer ${SUPABASE_PUBLISHABLE_KEY}` : '',
        apikey: SUPABASE_PUBLISHABLE_KEY ?? '',
      },
      body: JSON.stringify(opts?.body ?? {}),
    });

    const text = await res.text();
    try {
      const data = text ? JSON.parse(text) : null;
      return { data, error: null };
    } catch (e) {
      return { data: text, error: null };
    }
  } catch (error) {
    return { data: null, error };
  }
}

// Minimal supabase-like surface expected by the app
export const supabase = {
  functions: {
    invoke: invokeFunction,
  },
  // Any other calls will throw so missing backend usage is obvious
  from: () => ({
    select: async () => ({ data: null, error: new Error('Database removed') }),
    insert: async () => ({ data: null, error: new Error('Database removed') }),
    update: async () => ({ data: null, error: new Error('Database removed') }),
    delete: async () => ({ data: null, error: new Error('Database removed') }),
  }),
};
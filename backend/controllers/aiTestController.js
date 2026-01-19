import { callGoogleGenerative, callOpenAI } from '../services/aiService.js';
import { info, error } from '../utils/logger.js';

export async function aiTest(req, res) {
  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'google/gemini-2.5-flash';

    if (!OPENAI_KEY && !GOOGLE_API_KEY) return res.status(500).json({ success: false, error: 'No AI API key set (set OPENAI_API_KEY or GOOGLE_API_KEY)' });

      const promptText = `System: reply with plain text 'pong'\nUser: ping`;
      let aiRes;
      try {
        if (OPENAI_KEY) aiRes = await callOpenAI(OPENAI_MODEL, OPENAI_KEY, promptText);
        else aiRes = await callGoogleGenerative(GOOGLE_MODEL, GOOGLE_API_KEY, promptText);
      } catch (err) {
        error('AI test call exception', err);
        return res.status(500).json({ success: false, error: 'AI call exception', rawError: err instanceof Error ? err.message : String(err) });
      }

    const status = aiRes.status || (aiRes.ok ? 200 : 500);
    let bodyText = '<no-body>';
    try {
      bodyText = await aiRes.text();
    } catch (e) {
      bodyText = '<failed-to-read-body>';
    }

    info('AI test response', { status });
    return res.status(200).json({ success: true, status, raw: bodyText });
  } catch (err) {
    error('AI test handler error', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
}

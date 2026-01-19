import fetch from 'node-fetch';
import { error } from '../utils/logger.js';

// Calls OpenAI Chat Completions (preferred when OPENAI_API_KEY is set)
export async function callOpenAI(model, apiKey, promptText) {
  const url = `https://api.openai.com/v1/chat/completions`;
  try {
    const body = {
      model: model || 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: promptText }
      ],
      temperature: 0.1,
      max_tokens: 2048,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    return res;
  } catch (err) {
    error('OpenAI call failed', err);
    throw err;
  }
}

// Keep a generic extractor to support multiple AI response shapes
export function extractContentFromAIResponse(aiData) {
  // OpenAI chat completion format
  if (aiData?.choices?.[0]?.message?.content) return aiData.choices[0].message.content;
  // Older fields / other providers
  if (aiData?.candidates?.[0]?.content) return aiData.candidates[0].content;
  if (aiData?.output?.[0]?.content) return aiData.output[0].content;
  if (typeof aiData?.generated_text === 'string') return aiData.generated_text;
  return JSON.stringify(aiData);
}

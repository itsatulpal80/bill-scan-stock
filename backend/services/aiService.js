import fetch from "node-fetch";
import { error } from "../utils/logger.js";

/**
 * ✅ OpenAI Vision OCR (LATEST Responses API)
 */
export async function callOpenAI(model, apiKey, imageBase64, systemPrompt) {
  try {
    const imageData = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Extract structured JSON from this pharmacy purchase bill." },
              { type: "input_image", image_url: imageData },
            ],
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        `OpenAI ${res.status}: ${JSON.stringify(data)}`
      );
    }

    return data;
  } catch (err) {
    error("OpenAI call failed", err);
    throw err;
  }
}

/**
 * ✅ Google Gemini fallback (text only)
 */
export async function callGoogleGenerative(model, apiKey, promptText) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        `Google AI ${res.status}: ${JSON.stringify(data)}`
      );
    }

    return data;
  } catch (err) {
    error("Google AI call failed", err);
    throw err;
  }
}

/**
 * ✅ Unified extractor (UPDATED)
 */
export function extractContentFromAIResponse(aiData) {
  // OpenAI Responses API
  if (aiData?.output_text) return aiData.output_text;

  // Google Gemini
  if (aiData?.candidates?.[0]?.content?.parts?.[0]?.text)
    return aiData.candidates[0].content.parts[0].text;

  return JSON.stringify(aiData);
}

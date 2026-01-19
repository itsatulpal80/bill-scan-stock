import { OCRResult } from '@/types/pharmacy';

export interface OCRResponse {
  success: boolean;
  data?: OCRResult;
  error?: string;
  rawContent?: string;
}

const BACKEND_URL = (import.meta.env.VITE_API_URL as string) || '';

export async function processOCR(imageFile: File): Promise<OCRResponse> {
  try {
    // Compress/rescale large images to reduce payload size for AI services
    const base64 = await compressImageToBase64(imageFile, { maxWidth: 1600, quality: 0.8 });

    const url = `${BACKEND_URL}/ocr`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('OCR backend error:', res.status, text);
      return { success: false, error: `OCR service error: ${res.status}` };
    }

    const json = await res.json();
    return json as OCRResponse;
  } catch (err) {
    console.error('OCR processing error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to process image',
    };
  }
}

async function compressImageToBase64(file: File, opts: { maxWidth?: number; quality?: number } = {}) {
  const maxWidth = opts.maxWidth || 1600;
  const quality = typeof opts.quality === 'number' ? opts.quality : 0.8;

  // If file is already small, just convert to base64 directly
  if (file.size < 300 * 1024) {
    return await fileToBase64(file);
  }

  const imgBitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxWidth / imgBitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(imgBitmap.width * ratio);
  canvas.height = Math.round(imgBitmap.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return await fileToBase64(file);
  ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
  // convert to JPEG to reduce size
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return dataUrl;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

import { supabase } from '@/integrations/supabase/client';
import { OCRResult } from '@/types/pharmacy';

export interface OCRResponse {
  success: boolean;
  data?: OCRResult;
  error?: string;
  rawContent?: string;
}

export async function processOCR(imageFile: File): Promise<OCRResponse> {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(imageFile);
    
    const { data, error } = await supabase.functions.invoke('ocr-bill', {
      body: { imageBase64: base64 },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to OCR service' 
      };
    }

    return data as OCRResponse;
  } catch (err) {
    console.error('OCR processing error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to process image' 
    };
  }
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing OCR request...');

    const systemPrompt = `You are an OCR specialist for Indian pharmacy purchase bills/invoices.
Extract structured data from medicine purchase bills/invoices.

IMPORTANT: Analyze the image carefully and extract ALL visible medicine entries.

Return a JSON object with this exact structure:
{
  "supplierName": "Distributor/Supplier name from the bill",
  "invoiceNumber": "Invoice/Bill number",
  "invoiceDate": "YYYY-MM-DD format",
  "items": [
    {
      "medicineName": "Full medicine name with strength (e.g., Paracetamol 500mg)",
      "quantity": number,
      "purchaseRate": number (rate per unit),
      "mrp": number (maximum retail price per unit),
      "batchNumber": "Batch/Lot number",
      "expiryDate": "YYYY-MM format",
      "confidence": number (0-100, your confidence in this extraction)
    }
  ]
}

Guidelines:
- Extract medicine name with dosage/strength
- If MRP is per strip/pack, convert to per unit if quantity is in units
- For expiry dates, use YYYY-MM format
- Batch numbers are usually alphanumeric codes
- Set confidence lower (60-80) if text is unclear or partially visible
- If GST/tax info is visible, still focus on the medicine details
- Common Indian bill formats include columns like: Item, Batch, Expiry, Qty, Rate, MRP, Amount`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all medicine details from this pharmacy purchase bill/invoice image. Return valid JSON only.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI service quota exceeded. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process image with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the response
    let ocrResult;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      ocrResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse extracted data. Please try again with a clearer image.',
          rawContent: content
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the structure
    if (!ocrResult.items || !Array.isArray(ocrResult.items)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract medicine items from the image. Please ensure the bill is clearly visible.' 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully extracted ${ocrResult.items.length} items`);

    return new Response(
      JSON.stringify({ success: true, data: ocrResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OCR error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process image' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Received request to upload-to-catbox');
    const { imageData, userhash: requestUserhash } = await req.json();

    if (!imageData) {
      console.error('❌ Missing imageData');
      return new Response(
        JSON.stringify({ error: 'Missing imageData' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('📏 Image data size:', Math.round(imageData.length / 1024), 'KB');

    // Get userhash from environment variable (more secure) or from request
    const userhash = Deno.env.get('CATBOX_USERHASH') || requestUserhash;
    console.log('🔑 Userhash found:', userhash ? 'Yes' : 'No');

    if (!userhash) {
      console.error('❌ Missing userhash');
      return new Response(
        JSON.stringify({ error: 'Missing userhash. Please set CATBOX_USERHASH in Supabase Edge Function secrets.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Convert base64 to blob
    console.log('🔄 Converting base64 to blob...');
    const base64Data = imageData.split(',')[1] || imageData;
    
    let blob: Blob;
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      blob = new Blob([bytes]);
      console.log('✅ Blob created, size:', blob.size, 'bytes');
    } catch (conversionError) {
      console.error('❌ Error converting base64 to blob:', conversionError);
      return new Response(
        JSON.stringify({ error: 'Failed to convert image data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create FormData
    console.log('📦 Creating FormData...');
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', userhash);
    formData.append('fileToUpload', blob, 'image.jpg');

    // Upload to catbox.moe
    console.log('📤 Uploading to catbox.moe...');
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });
    console.log('📥 Catbox response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Catbox upload failed: ${errorText}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const imageUrl = await response.text();
    console.log('✅ Upload successful, URL:', imageUrl.trim());

    return new Response(
      JSON.stringify({ url: imageUrl.trim() }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});


import { supabase } from './supabase';

const CATBOX_USERHASH = process.env.EXPO_PUBLIC_CATBOX_USERHASH || '91318ab7fb7df25299e14a84b';

/**
 * Upload image to Catbox.moe via Supabase Edge Function (to avoid CORS issues)
 * @param imageUri - The image URI (can be data URI, blob URI, or file path)
 * @returns The uploaded image URL
 */
export async function uploadImageToCatbox(imageUri: string): Promise<string> {
  if (!CATBOX_USERHASH) {
    console.error('Catbox userhash is missing. Please set EXPO_PUBLIC_CATBOX_USERHASH in your .env file');
    throw new Error('Catbox userhash is not configured');
  }

  // Convert image to base64
  let base64String = '';
  
  try {
    if (typeof window !== 'undefined') {
      // On web, convert image to base64
      if (imageUri.startsWith('data:')) {
        // Already a data URI
        base64String = imageUri;
      } else {
        // Fetch the image and convert to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } else {
      // For React Native (mobile), we'd need to use expo-file-system or similar
      // For now, assume it's already a data URI or we need to handle it differently
      base64String = imageUri;
    }
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('فشل معالجة الصورة للرفع: ' + (error as Error).message);
  }

  try {
    console.log('📤 Starting upload to Catbox via Edge Function...');
    console.log('📏 Image data size:', Math.round(base64String.length / 1024), 'KB');
    
    // For very large images (>1MB), compress or warn
    if (base64String.length > 1024 * 1024) {
      console.warn('⚠️ Large image detected (>1MB). Upload may take longer.');
    }
    
    // Use Supabase Edge Function to upload (avoids CORS issues)
    // Note: userhash should be set as CATBOX_USERHASH secret in Supabase Edge Function
    // If not set, it will fallback to sending it in the request body
    console.log('🔗 Invoking Edge Function: upload-to-catbox');
    console.log('🌐 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    console.log('🔑 Supabase Key exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    
    // Use fetch directly instead of supabase.functions.invoke (more reliable on web)
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/upload-to-catbox`;
    
    console.log('🌐 Function URL:', functionUrl);
    console.log('📦 Request body size:', Math.round(JSON.stringify({ imageData: base64String, userhash: CATBOX_USERHASH }).length / 1024), 'KB');
    
    const invokePromise = fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey || '',
      },
      body: JSON.stringify({
        imageData: base64String,
        userhash: CATBOX_USERHASH,
      }),
    }).then(async (response) => {
      console.log('📥 Response status:', response.status);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return { data, error: null };
    }).catch((error) => {
      console.error('❌ Fetch error:', error);
      return { data: null, error };
    });
    
    // Add a progress check to see if request is being sent
    console.log('⏳ Waiting for Edge Function response...');

    // Add timeout (longer for very large images)
    // For images >1MB, use 120 seconds, otherwise 60 seconds
    const timeoutDuration = base64String.length > 1024 * 1024 ? 120000 : 60000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`انتهت مهلة الطلب (${timeoutDuration / 1000} ثانية). يرجى التحقق من أن Edge Function منشورة بشكل صحيح.`));
      }, timeoutDuration);
    });

    console.log(`⏱️ Starting upload with ${timeoutDuration / 1000}s timeout...`);
    const startTime = Date.now();
    
    const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
    
    const elapsedTime = Date.now() - startTime;
    console.log(`⏱️ Upload completed in ${elapsedTime}ms`);

    console.log('📥 Edge Function response:', { data, error });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`فشل رفع الصورة: ${error.message}`);
    }

    if (!data || !data.url) {
      throw new Error('لم يتم الحصول على رابط صحيح من Catbox.moe');
    }

    const imageUrl = data.url.trim();

    // Validate that we got a URL
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('لم يتم الحصول على رابط صحيح من Catbox.moe');
    }

    return imageUrl;
  } catch (error: any) {
    console.error('Catbox upload error:', error);
    
    // Check if it's a timeout error
    if (error.message?.includes('مهلة') || error.message?.includes('timeout')) {
      throw new Error('انتهت مهلة الطلب. يرجى التحقق من:\n1. أن Edge Function "upload-to-catbox" منشورة في Supabase Dashboard\n2. أن Secret "CATBOX_USERHASH" موجود\n3. أن Edge Function تعمل بشكل صحيح');
    }
    
    // Check if it's a network error
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('فشل الاتصال بـ Edge Function. يرجى التحقق من الاتصال بالإنترنت.');
    }
    
    if (error.message) {
      throw new Error(`فشل رفع الصورة: ${error.message}`);
    }
    
    throw new Error('حدث خطأ غير متوقع أثناء رفع الصورة');
  }
}


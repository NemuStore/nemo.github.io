import * as ImageManipulator from 'expo-image-manipulator';

// IMGBB API Keys for load balancing
const IMGBB_API_KEYS = [
  'fe750f112c2b32bd4b6fa88e77390aea',
  'cfbb69eef89f4ad826855a221bcde9ee',
  '011427321f6a286e9633459778e7c420',
  'db02580279e4020eaaa46289221bae97',
];

// Track current key index for round-robin load balancing
let currentKeyIndex = 0;

/**
 * Get next API key using round-robin load balancing
 */
function getNextApiKey(): string {
  const key = IMGBB_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % IMGBB_API_KEYS.length;
  return key;
}

/**
 * Convert image to AVIF format (or best available format)
 * @param imageUri - The image URI
 * @returns Base64 string of converted image
 */
async function convertToAVIF(imageUri: string): Promise<string> {
  try {
    // For web, try to convert to AVIF using canvas
    if (typeof window !== 'undefined') {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Try to convert to AVIF (if browser supports it)
            canvas.toBlob(
              (blob) => {
                if (blob && blob.type === 'image/avif') {
                  // AVIF conversion successful
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    console.log('✅ Image converted to AVIF format');
                    resolve(reader.result as string);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                } else {
                  // Fallback to WebP or JPEG
                  canvas.toBlob(
                    (fallbackBlob) => {
                      if (fallbackBlob) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          console.log('ℹ️ Using WebP format (AVIF not supported)');
                          resolve(reader.result as string);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(fallbackBlob);
                      } else {
                        reject(new Error('Failed to convert image'));
                      }
                    },
                    'image/webp',
                    0.85
                  );
                }
              },
              'image/avif',
              0.85
            );
          };
          img.onerror = reject;
          img.src = imageUri;
        });
      } catch (error) {
        console.warn('⚠️ AVIF conversion failed, using ImageManipulator:', error);
        // Fallback to ImageManipulator
      }
    }
    
    // React Native: Use ImageManipulator with WebP (best compression)
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [], // No transformations, just format conversion
      {
        compress: 0.85, // Good quality with compression
        format: ImageManipulator.SaveFormat.WEBP, // WebP for best compression on mobile
        base64: true,
      }
    );
    
    return manipulated.uri;
  } catch (error) {
    console.error('Error converting image:', error);
    throw error;
  }
}

/**
 * Upload image to IMGBB with load balancing and AVIF conversion
 * @param imageUri - The image URI (can be data URI, blob URI, or file path)
 * @param retryCount - Number of retries if upload fails (default: 3)
 * @returns The uploaded image URL
 */
export async function uploadImageToImgbb(
  imageUri: string,
  retryCount: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  
  // Try each API key in round-robin fashion
  for (let attempt = 0; attempt < retryCount * IMGBB_API_KEYS.length; attempt++) {
    const apiKey = getNextApiKey();
    
    try {
      console.log(`📤 Uploading to IMGBB (attempt ${attempt + 1}, key ${currentKeyIndex})...`);
      
      // Convert image to AVIF format first
      let imageDataUri: string;
      
      try {
        imageDataUri = await convertToAVIF(imageUri);
        console.log('✅ Image converted successfully');
      } catch (convertError) {
        console.warn('⚠️ AVIF conversion failed, using original image:', convertError);
        // Fallback: use original image
        if (imageUri.startsWith('data:')) {
          imageDataUri = imageUri;
        } else {
          // Fetch and convert to data URI
          const response = await fetch(imageUri);
          const blob = await response.blob();
          imageDataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }
      
      // Extract base64 data
      const imageData = imageDataUri.includes(',') 
        ? imageDataUri.split(',')[1] 
        : imageDataUri;
      
      if (!imageData) {
        throw new Error('فشل تحويل الصورة إلى base64');
      }
      
      console.log(`📏 Image data size: ${Math.round(imageData.length / 1024)} KB`);
      
      // IMGBB API accepts base64 as form data
      // Format: key=API_KEY&image=BASE64_STRING
      const formData = new FormData();
      formData.append('key', apiKey);
      formData.append('image', imageData); // base64 string
      
      console.log(`🌐 Uploading to IMGBB API (key index: ${(currentKeyIndex - 1 + IMGBB_API_KEYS.length) % IMGBB_API_KEYS.length})...`);
      
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        console.error(`❌ IMGBB upload failed (key ${currentKeyIndex}):`, errorMsg);
        lastError = new Error(errorMsg);
        
        // If it's a rate limit error, wait a bit before retrying
        if (response.status === 429 || data.error?.code === 429) {
          console.log('⏳ Rate limit hit, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Continue to next attempt
        continue;
      }
      
      const imageUrl = data.data?.url || data.data?.display_url;
      
      if (!imageUrl || !imageUrl.startsWith('http')) {
        throw new Error('لم يتم الحصول على رابط صحيح من IMGBB');
      }
      
      console.log(`✅ Image uploaded successfully: ${imageUrl}`);
      return imageUrl;
      
    } catch (error: any) {
      console.error(`❌ Upload attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      if (attempt < retryCount * IMGBB_API_KEYS.length - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, Math.floor(attempt / IMGBB_API_KEYS.length)), 5000);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All attempts failed
  throw new Error(
    `فشل رفع الصورة بعد ${retryCount * IMGBB_API_KEYS.length} محاولة. آخر خطأ: ${lastError?.message || 'غير معروف'}`
  );
}


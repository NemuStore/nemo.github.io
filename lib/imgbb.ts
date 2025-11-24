import axios from 'axios';

const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY || '';

export interface ImgBBResponse {
  data: {
    url: string;
    display_url: string;
    delete_url: string;
  };
  success: boolean;
  status: number;
}

export async function uploadImageToImgBB(imageUri: string): Promise<string> {
  if (!IMGBB_API_KEY) {
    console.error('IMGBB API key is missing. Please set EXPO_PUBLIC_IMGBB_API_KEY in your .env file');
    throw new Error('IMGBB API key is not configured');
  }
  
  // Debug: Log that API key is present (without exposing the actual key)
  console.log('ImgBB API key is configured:', IMGBB_API_KEY ? 'Yes' : 'No');

  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  
  // Handle web platform differently
  if (typeof window !== 'undefined') {
    // On web, ImgBB API requires base64 string
    try {
      let base64String = '';
      
      // If it's already a data URI (base64), extract the base64 part
      if (imageUri.startsWith('data:')) {
        // Remove the data:image/...;base64, prefix
        base64String = imageUri.split(',')[1] || imageUri;
      } else {
        // Fetch the image and convert to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Convert blob to base64
        base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data:image/...;base64, prefix if present
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      // ImgBB API accepts base64 string directly
      formData.append('image', base64String);
    } catch (error) {
      console.error('Error processing image for web:', error);
      throw new Error('Failed to process image for upload: ' + (error as Error).message);
    }
  } else {
    // For React Native (mobile), use the URI format
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);
  }

  try {
    // Don't set Content-Type manually - axios needs to set it with boundary for FormData
    const uploadResponse = await axios.post<ImgBBResponse>(
      'https://api.imgbb.com/1/upload',
      formData
    );

    if (uploadResponse.data.success) {
      return uploadResponse.data.data.url;
    } else {
      throw new Error('Failed to upload image to ImgBB');
    }
  } catch (error: any) {
    console.error('ImgBB upload error:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      
      // Extract and handle specific error messages from imgBB
      if (error.response.data?.error) {
        const errorObj = error.response.data.error;
        let errorMessage = '';
        
        // Handle rate limit error specifically
        if (errorObj.code === 100 || errorObj.message?.includes('Rate limit')) {
          errorMessage = 'تم الوصول إلى الحد الأقصى لرفع الصور. يرجى المحاولة مرة أخرى لاحقاً أو ترقية حساب imgBB.';
        } else if (typeof errorObj === 'object') {
          errorMessage = errorObj.message || JSON.stringify(errorObj);
        } else {
          errorMessage = errorObj;
        }
        
        console.error('ImgBB error message:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // If no specific error message, throw generic error with status
      throw new Error(`فشل رفع الصورة (خطأ ${error.response.status})`);
    }
    
    // If it's a network error or other issue
    if (error.message) {
      throw new Error(`فشل رفع الصورة: ${error.message}`);
    }
    
    throw new Error('حدث خطأ غير متوقع أثناء رفع الصورة');
  }
}


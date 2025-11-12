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
    throw new Error('IMGBB API key is not configured');
  }

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
    const uploadResponse = await axios.post<ImgBBResponse>(
      'https://api.imgbb.com/1/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
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
    }
    throw error;
  }
}


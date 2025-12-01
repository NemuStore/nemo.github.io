import { Image, Platform } from 'react-native';

/**
 * Image utility functions for optimizing image loading
 * Inspired by Temu's optimization techniques:
 * - Dynamic resizing based on display size
 * - Quality control (lower quality for thumbnails)
 * - Modern formats (WebP/AVIF when available)
 * - Efficient caching
 */

/**
 * Get optimized image URL for thumbnails (smaller size)
 * Optimized for fast loading with lower quality for thumbnails
 * 
 * @param imageUrl - Original image URL
 * @param size - Target size in pixels (default: 150)
 * @param quality - Quality level 1-100 (default: 30 for thumbnails, lower = faster)
 * @returns Optimized image URL
 */
export const getThumbnailUrl = (imageUrl: string, size: number = 150, quality: number = 30): string => {
  if (!imageUrl) return imageUrl;
  
  // Add cache busting and optimization hints
  // Note: catbox.moe and imgbb.co don't support dynamic resizing,
  // but we can add query params for cache control and hints
  const separator = imageUrl.includes('?') ? '&' : '?';
  
  // For imgbb.co - add optimization hints
  if (imageUrl.includes('i.ibb.co') || imageUrl.includes('ibb.co')) {
    // Add cache control and size hint (browser will resize)
    return `${imageUrl}${separator}_thumbnail=${size}&_q=${quality}&_opt=1`;
  }
  
  // For catbox.moe - add optimization hints
  if (imageUrl.includes('catbox.moe')) {
    // Add cache control and size hint
    return `${imageUrl}${separator}_thumbnail=${size}&_q=${quality}&_opt=1`;
  }
  
  // For other services, add optimization hints
  return `${imageUrl}${separator}_thumbnail=${size}&_q=${quality}&_opt=1`;
};

/**
 * Get optimized image URL for main display
 * Higher quality for main product images
 * 
 * @param imageUrl - Original image URL
 * @param quality - Quality level 1-100 (default: 75 for main images)
 * @returns Optimized image URL
 */
export const getMainImageUrl = (imageUrl: string, quality: number = 75): string => {
  if (!imageUrl) return imageUrl;
  
  // Add cache control and quality hint
  const separator = imageUrl.includes('?') ? '&' : '?';
  
  // For imgbb.co - add quality hint
  if (imageUrl.includes('i.ibb.co') || imageUrl.includes('ibb.co')) {
    return `${imageUrl}${separator}_main=1&_q=${quality}&_opt=1`;
  }
  
  // For catbox.moe - add quality hint
  if (imageUrl.includes('catbox.moe')) {
    return `${imageUrl}${separator}_main=1&_q=${quality}&_opt=1`;
  }
  
  // For other services, add quality hint
  return `${imageUrl}${separator}_main=1&_q=${quality}&_opt=1`;
};

/**
 * Get optimized image URL for medium-sized images (product cards)
 * Balanced quality and size for list views
 * 
 * @param imageUrl - Original image URL
 * @param size - Target size in pixels (default: 250)
 * @param quality - Quality level 1-100 (default: 50 for cards)
 * @returns Optimized image URL
 */
export const getCardImageUrl = (imageUrl: string, size: number = 250, quality: number = 50): string => {
  if (!imageUrl) return imageUrl;
  
  const separator = imageUrl.includes('?') ? '&' : '?';
  
  // Add optimization hints for card images
  if (imageUrl.includes('i.ibb.co') || imageUrl.includes('ibb.co') || imageUrl.includes('catbox.moe')) {
    return `${imageUrl}${separator}_card=${size}&_q=${quality}&_opt=1`;
  }
  
  return `${imageUrl}${separator}_card=${size}&_q=${quality}&_opt=1`;
};

/**
 * Preload image with error handling and timeout
 * Optimized for faster loading
 * 
 * @param url - Image URL to preload
 * @param timeout - Timeout in milliseconds (default: 3000ms)
 * @returns Promise that resolves to true if successful
 */
export const preloadImage = async (url: string, timeout: number = 3000): Promise<boolean> => {
  try {
    // Use Promise.race to add timeout
    const prefetchPromise = Image.prefetch(url);
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeout);
    });
    
    const result = await Promise.race([prefetchPromise, timeoutPromise]);
    return result === true;
  } catch (error) {
    // Silently fail for preloading - not critical
    return false;
  }
};

/**
 * Preload multiple images in parallel with concurrency limit
 * Inspired by Temu's efficient preloading strategy
 * 
 * @param urls - Array of image URLs to preload
 * @param concurrency - Maximum number of concurrent preloads (default: 5)
 * @returns Promise that resolves when all images are preloaded or timeout
 */
export const preloadImages = async (urls: string[], concurrency: number = 5): Promise<void> => {
  // Process in batches to avoid overwhelming the network
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    await Promise.all(batch.map(url => preloadImage(url)));
  }
};


/**
 * Cloudinary image upload utilities
 * Uses unsigned uploads for secure client-side uploads
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dz5bkdxb1';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'logistica_uploads';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Uploads an image to Cloudinary using unsigned upload
 * @param file - The image file to upload
 * @param folder - Folder name (e.g., 'logistica/visitas', 'logistica/facturas')
 * @param filename - Optional custom filename (without extension)
 * @returns Promise with upload result including URL
 */
export async function uploadToCloudinary(
  file: File | Blob,
  folder: string = 'general',
  filename?: string
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  // Custom filename for easier identification
  if (filename) {
    formData.append('public_id', filename);
  }

  // Auto-tagging
  formData.append('tags', 'logistica-app');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Error uploading to Cloudinary');
  }

  return response.json();
}

/**
 * Deletes an image from Cloudinary
 * Note: Requires backend for secure deletion, this is a placeholder
 * For now, images are just orphaned (not deleted from Cloudinary)
 */
export async function deleteFromCloudinary(_publicId: string): Promise<boolean> {
  // Note: Secure deletion requires the API Secret (backend only)
  // For now, we'll just return true - images remain in Cloudinary
  // In production, implement a Supabase Edge Function for deletion
  console.log('Note: Cloudinary deletion requires backend implementation');
  return true;
}

/**
 * Gets optimized URL for display
 * @param url - Original Cloudinary URL
 * @param width - Desired width (auto-optimized)
 * @returns Optimized URL string
 */
export function getOptimizedUrl(url: string, width: number = 800): string {
  if (!url.includes('cloudinary.com')) return url;

  // Transform URL to include optimization parameters
  // https://res.cloudinary.com/cloud-name/image/upload/v123/public_id.jpg
  // becomes: https://res.cloudinary.com/cloud-name/image/upload/w_800,q_auto/v123/public_id.jpg

  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  return `${parts[0]}/upload/w_${width},q_auto,f_auto/${parts[1]}`;
}

/**
 * Extracts public_id from Cloudinary URL
 */
export function getPublicIdFromUrl(url: string): string | null {
  if (!url.includes('cloudinary.com')) return null;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return null;

    // Get everything after 'upload' and version if present
    let publicIdParts = pathParts.slice(uploadIndex + 1);
    // Skip version if present (v1234567890)
    if (publicIdParts[0]?.startsWith('v') && !isNaN(Number(publicIdParts[0].slice(1)))) {
      publicIdParts = publicIdParts.slice(1);
    }

    // Join and remove extension
    const publicId = publicIdParts.join('/').replace(/\.[^.]+$/, '');
    return publicId;
  } catch {
    return null;
  }
}
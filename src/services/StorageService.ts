import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const POST_IMAGES_BUCKET = 'post_images'; // Name of your Supabase Storage bucket
const INCIDENT_IMAGES_BUCKET = 'incident_images'; // New bucket for incident images
const MAX_IMAGE_SIZE_MB = 2; // Max file size in MB
const MAX_IMAGE_DIMENSION = 1200; // Max width/height for resized images
const JPEG_QUALITY = 0.8; // JPEG compression quality

export const StorageService = {
  async resizeAndCompressImage(file: File): Promise<File | null> {
    return new Promise((resolve) => {
      if (file.size / (1024 * 1024) > MAX_IMAGE_SIZE_MB) {
        toast.error(`Image size exceeds ${MAX_IMAGE_SIZE_MB}MB. Please upload a smaller image.`);
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions to fit within MAX_IMAGE_DIMENSION
          if (width > height) {
            if (width > MAX_IMAGE_DIMENSION) {
              height *= MAX_IMAGE_DIMENSION / width;
              width = MAX_IMAGE_DIMENSION;
            }
          } else {
            if (height > MAX_IMAGE_DIMENSION) {
              width *= MAX_IMAGE_DIMENSION / height;
              height = MAX_IMAGE_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const resizedFile = new File([blob], file.name, {
                    type: 'image/jpeg', // Force JPEG for compression
                    lastModified: Date.now(),
                  });
                  resolve(resizedFile);
                } else {
                  toast.error('Failed to compress image.');
                  resolve(null);
                }
              },
              'image/jpeg',
              JPEG_QUALITY
            );
          } else {
            toast.error('Failed to get canvas context.');
            resolve(null);
          }
        };
        img.onerror = (err) => {
          console.error('Error loading image for resizing:', err);
          toast.error('Failed to load image for processing.');
          resolve(null);
        };
      };
      reader.onerror = (err) => {
        console.error('Error reading file for resizing:', err);
        toast.error('Failed to read image file.');
        resolve(null);
      };
    });
  },

  async _uploadToBucket(file: File, bucketName: string): Promise<string | null> {
    if (!file) return null;

    const processedFile = await this.resizeAndCompressImage(file);
    if (!processedFile) return null;

    const fileExtension = processedFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = `${fileName}`;

    try {
      const { data: _data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error(`Error uploading image to ${bucketName}:`, error);
        toast.error(`Image upload failed: ${error.message}`);
        return null;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error(`Unexpected error during image upload to ${bucketName}:`, error);
      toast.error(`An unexpected error occurred: ${error.message}`);
      return null;
    }
  },

  async _deleteFromBucket(imageUrl: string, bucketName: string): Promise<boolean> {
    if (!imageUrl) return false;

    try {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([fileName]);

      if (error) {
        console.error(`Error deleting image from ${bucketName}:`, error);
        toast.error(`Image deletion failed: ${error.message}`);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error(`Unexpected error during image deletion from ${bucketName}:`, error);
      toast.error(`An unexpected error occurred: ${error.message}`);
      return false;
    }
  },

  // Post image specific methods
  async uploadImage(file: File): Promise<string | null> {
    return this._uploadToBucket(file, POST_IMAGES_BUCKET);
  },

  async deleteImage(imageUrl: string): Promise<boolean> {
    return this._deleteFromBucket(imageUrl, POST_IMAGES_BUCKET);
  },

  // Incident image specific methods
  async uploadIncidentImage(file: File): Promise<string | null> {
    return this._uploadToBucket(file, INCIDENT_IMAGES_BUCKET);
  },

  async deleteIncidentImage(imageUrl: string): Promise<boolean> {
    return this._deleteFromBucket(imageUrl, INCIDENT_IMAGES_BUCKET);
  },
};
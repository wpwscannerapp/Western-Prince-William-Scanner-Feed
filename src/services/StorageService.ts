"use client";

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

const INCIDENT_IMAGES_BUCKET = 'incident_images';
const PROFILE_AVATARS_BUCKET = 'profile_avatars'; // New bucket for profile avatars
const MAX_IMAGE_SIZE_MB = 2;
const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;
const PNG_QUALITY = 0.9; // PNG compression quality (less effective than JPEG)

export const StorageService = {
  async resizeAndCompressImage(file: File): Promise<File | null> {
    return new Promise((resolve) => {
      if (import.meta.env.DEV) {
        console.log('StorageService: Starting image resize and compress for file:', file.name, 'Type:', file.type, 'Size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
      }

      if (file.size / (1024 * 1024) > MAX_IMAGE_SIZE_MB) {
        toast.error(`Image too large: Max ${MAX_IMAGE_SIZE_MB}MB allowed.`);
        AnalyticsService.trackEvent({ name: 'image_resize_failed', properties: { reason: 'size_exceeded', originalSize: file.size } });
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        if (import.meta.env.DEV) {
          console.log('StorageService: FileReader loaded image data.');
        }
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          if (import.meta.env.DEV) {
            console.log('StorageService: Image loaded into DOM. Original dimensions:', img.width, 'x', img.height);
          }
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

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
            if (import.meta.env.DEV) {
              console.log('StorageService: Image drawn to canvas. New dimensions:', width, 'x', height);
            }
            
            // Determine output format and quality
            const isPng = file.type === 'image/png';
            const outputMimeType = isPng ? 'image/png' : 'image/jpeg';
            const outputQuality = isPng ? PNG_QUALITY : JPEG_QUALITY;
            const outputExtension = isPng ? 'png' : 'jpeg';

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  // Use a unique name for the processed file, preserving the extension
                  const uniqueId = crypto.randomUUID();
                  const newFileName = `${uniqueId}.${outputExtension}`;

                  const resizedFile = new File([blob], newFileName, {
                    type: outputMimeType,
                    lastModified: Date.now(),
                  });
                  if (import.meta.env.DEV) {
                    console.log(`StorageService: Image compressed to blob (${outputMimeType}). New size:`, (resizedFile.size / (1024 * 1024)).toFixed(2), 'MB', 'New name:', newFileName);
                  }
                  AnalyticsService.trackEvent({ name: 'image_resized', properties: { originalSize: file.size, newSize: resizedFile.size, originalDimensions: `${img.width}x${img.height}`, newDimensions: `${width}x${height}`, outputMimeType } });
                  resolve(resizedFile);
                } else {
                  toast.error('Image processing failed: Could not create image data.');
                  if (import.meta.env.DEV) {
                    console.error('StorageService: Failed to create blob from canvas.');
                  }
                  AnalyticsService.trackEvent({ name: 'image_resize_failed', properties: { reason: 'blob_creation_failed' } });
                  resolve(null);
                }
              },
              outputMimeType,
              outputQuality
            );
          } else {
            toast.error('Image processing failed: Canvas context unavailable.');
            if (import.meta.env.DEV) {
              console.error('StorageService: Failed to get 2D context from canvas.');
            }
            AnalyticsService.trackEvent({ name: 'image_resize_failed', properties: { reason: 'canvas_context_failed' } });
            resolve(null);
          }
        };
        img.onerror = (err) => {
          if (import.meta.env.DEV) {
            console.error('StorageService: Error loading image for resizing:', err);
          }
          toast.error('Image processing failed: Could not load image file.');
          AnalyticsService.trackEvent({ name: 'image_resize_failed', properties: { reason: 'image_load_error', error: (err as Event).type } });
          resolve(null);
        };
      };
      reader.onerror = (err) => {
        if (import.meta.env.DEV) {
          console.error('StorageService: Error reading file for resizing:', err);
        }
        toast.error('Image processing failed: Could not read file.');
        AnalyticsService.trackEvent({ name: 'image_resize_failed', properties: { reason: 'file_read_error', error: (err as ProgressEvent).type } });
        resolve(null);
      };
    });
  },

  async _uploadToBucket(file: File, bucketName: string): Promise<string | null> {
    if (!file) {
      if (import.meta.env.DEV) {
        console.warn('StorageService: No file provided for upload.');
      }
      toast.error('Image upload failed: No file provided.');
      return null;
    }

    const processedFile = await this.resizeAndCompressImage(file);
    if (!processedFile) {
      if (import.meta.env.DEV) {
        console.error('StorageService: Image processing failed, cannot upload.');
      }
      // The specific error toast should have already been shown by resizeAndCompressImage
      return null;
    }

    // Use the processed file's name (which is now a UUID + extension)
    const fileName = processedFile.name;
    const filePath = `${fileName}`;

    try {
      if (import.meta.env.DEV) {
        console.log(`StorageService: Attempting to upload processed file (Type: ${processedFile.type}, Size: ${(processedFile.size / (1024 * 1024)).toFixed(2)}MB) to ${bucketName}/${filePath}`);
      }
      const { data: _data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        if (import.meta.env.DEV) {
          console.error(`StorageService: Error uploading image to ${bucketName}:`, error);
        }
        toast.error(`Image upload failed: ${error.message}`);
        AnalyticsService.trackEvent({ name: 'image_upload_failed', properties: { bucket: bucketName, error: error.message } });
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (import.meta.env.DEV) {
        console.log('StorageService: Image uploaded successfully. Public URL:', publicUrlData.publicUrl);
      }
      AnalyticsService.trackEvent({ name: 'image_uploaded', properties: { bucket: bucketName, filePath } });
      return publicUrlData.publicUrl;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error(`StorageService: Unexpected error during image upload to ${bucketName}:`, error);
      }
      toast.error(`An unexpected error occurred during upload: ${error.message}`);
      AnalyticsService.trackEvent({ name: 'image_upload_unexpected_error', properties: { bucket: bucketName, error: error.message } });
      return null;
    }
  },

  async _deleteFromBucket(imageUrl: string, bucketName: string): Promise<boolean> {
    if (!imageUrl) {
      if (import.meta.env.DEV) {
        console.warn('StorageService: No image URL provided for deletion.');
      }
      return false;
    }

    try {
      // Extract the file name from the public URL path
      const url = new URL(imageUrl);
      // The path is typically /storage/v1/object/public/bucketName/fileName
      const pathSegments = url.pathname.split('/');
      // The file name is the last segment
      const fileName = pathSegments[pathSegments.length - 1];

      if (import.meta.env.DEV) {
        console.log(`StorageService: Attempting to delete image ${fileName} from ${bucketName}.`);
      }
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([fileName]);

      if (error) {
        if (import.meta.env.DEV) {
          console.error(`StorageService: Error deleting image from ${bucketName}:`, error);
        }
        toast.error(`Image deletion failed: ${error.message}`);
        AnalyticsService.trackEvent({ name: 'image_delete_failed', properties: { bucket: bucketName, fileName, error: error.message } });
        return false;
      }
      if (import.meta.env.DEV) {
        console.log(`StorageService: Image ${fileName} deleted successfully from ${bucketName}.`);
      }
      AnalyticsService.trackEvent({ name: 'image_deleted', properties: { bucket: bucketName, fileName } });
      return true;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error(`StorageService: Unexpected error during image deletion from ${bucketName}:`, error);
      }
      toast.error(`An unexpected error occurred during deletion: ${error.message}`);
      AnalyticsService.trackEvent({ name: 'image_delete_unexpected_error', properties: { bucket: bucketName, error: error.message } });
      return false;
    }
  },

  async uploadImage(file: File): Promise<string | null> {
    return this._uploadToBucket(file, PROFILE_AVATARS_BUCKET); // Use new bucket for avatars
  },

  async deleteImage(imageUrl: string): Promise<boolean> {
    return this._deleteFromBucket(imageUrl, PROFILE_AVATARS_BUCKET); // Use new bucket for avatars
  },

  async uploadIncidentImage(file: File): Promise<string | null> {
    return this._uploadToBucket(file, INCIDENT_IMAGES_BUCKET);
  },

  async deleteIncidentImage(imageUrl: string): Promise<boolean> {
    return this._deleteFromBucket(imageUrl, INCIDENT_IMAGES_BUCKET);
  },
};
import { supabase } from '@/integrations/supabase/client'; // Updated import path
import { toast } from 'sonner';

const POST_IMAGES_BUCKET = 'post_images'; // Name of your Supabase Storage bucket

export const StorageService = {
  async uploadImage(file: File): Promise<string | null> {
    if (!file) return null;

    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = `${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from(POST_IMAGES_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading image:', error);
        toast.error(`Image upload failed: ${error.message}`);
        return null;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(POST_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error('Unexpected error during image upload:', error);
      toast.error(`An unexpected error occurred: ${error.message}`);
      return null;
    }
  },

  async deleteImage(imageUrl: string): Promise<boolean> {
    if (!imageUrl) return false;

    try {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const { error } = await supabase.storage
        .from(POST_IMAGES_BUCKET)
        .remove([fileName]);

      if (error) {
        console.error('Error deleting image:', error);
        toast.error(`Image deletion failed: ${error.message}`);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Unexpected error during image deletion:', error);
      toast.error(`An unexpected error occurred: ${error.message}`);
      return false;
    }
  }
};
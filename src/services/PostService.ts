import { supabase } from '@/integrations/supabase/client'; // Updated import path
import { StorageService } from './StorageService'; // Import StorageService

export interface Post {
  id: string;
  text: string;
  image_url?: string;
  timestamp: string;
  admin_id: string;
}

const POSTS_PER_PAGE = 10;

export const PostService = {
  async fetchPosts(page: number = 0): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
    return data as Post[];
  },

  async fetchNewPosts(lastTimestamp: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .gt('timestamp', lastTimestamp)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching new posts:', error);
      return [];
    }
    return data as Post[];
  },

  async createPost(text: string, imageFile: File | null, adminId: string): Promise<Post | null> {
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await StorageService.uploadImage(imageFile);
      if (!imageUrl) return null; // Failed to upload image
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({ text, image_url: imageUrl, admin_id: adminId })
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return null;
    }
    return data as Post;
  },

  async updatePost(id: string, text: string, imageFile: File | null, currentImageUrl: string | null): Promise<Post | null> {
    let imageUrl: string | null = currentImageUrl;

    if (imageFile) {
      // If a new image is provided, upload it and delete the old one if it exists
      const newImageUrl = await StorageService.uploadImage(imageFile);
      if (!newImageUrl) return null;
      if (currentImageUrl) {
        await StorageService.deleteImage(currentImageUrl);
      }
      imageUrl = newImageUrl;
    } else if (currentImageUrl && !imageFile) {
      // If no new image and current image was removed (e.g., by setting imageFile to null explicitly)
      // This logic might need refinement based on how your UI handles image removal vs. no change
      // For now, if imageFile is null and currentImageUrl exists, we assume no change unless explicitly handled by UI
    }


    const { data, error } = await supabase
      .from('posts')
      .update({ text, image_url: imageUrl, timestamp: new Date().toISOString() }) // Update timestamp on edit
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      return null;
    }
    return data as Post;
  },

  async deletePost(id: string, imageUrl: string | null): Promise<boolean> {
    if (imageUrl) {
      await StorageService.deleteImage(imageUrl);
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting post:', error);
      return false;
    }
    return true;
  },

  async fetchSubscriberCount(): Promise<number> {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .in('subscription_status', ['trialing', 'active']); // Count users with active or trialing subscriptions

    if (error) {
      console.error('Error fetching subscriber count:', error);
      return 0;
    }
    return count || 0;
  }
};
import { supabase } from '@/integrations/supabase/client';
import { StorageService } from './StorageService';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';

export interface Post {
  id: string;
  text: string;
  image_url?: string;
  timestamp: string;
  admin_id: string;
}

export const POSTS_PER_PAGE = 10;

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

export const PostService = {
  POSTS_PER_PAGE,

  async fetchPosts(page: number = 0): Promise<Post[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .abortSignal(controller.signal)
        .order('timestamp', { ascending: false })
        .range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);

      if (error) {
        logSupabaseError('fetchPosts', error);
        return [];
      }
      return data as Post[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching posts timed out.');
      } else {
        logSupabaseError('fetchPosts', err);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchSinglePost(postId: string): Promise<Post | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logSupabaseError('fetchSinglePost', error);
        return null;
      }
      return data as Post;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching single post timed out.');
      } else {
        logSupabaseError('fetchSinglePost', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchNewPosts(lastTimestamp: string): Promise<Post[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .gt('timestamp', lastTimestamp)
        .abortSignal(controller.signal)
        .order('timestamp', { ascending: false });

      if (error) {
        logSupabaseError('fetchNewPosts', error);
        return [];
      }
      return data as Post[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching new posts timed out.');
      } else {
        logSupabaseError('fetchNewPosts', err);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async createPost(text: string, imageFile: File | null, adminId: string): Promise<Post | null> {
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await StorageService.uploadImage(imageFile);
      if (!imageUrl) return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({ text, image_url: imageUrl, admin_id: adminId })
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('createPost', error);
        return null;
      }
      return data as Post;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Creating post timed out.');
      } else {
        logSupabaseError('createPost', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async updatePost(id: string, text: string, imageFile: File | null, currentImageUrl: string | null): Promise<Post | null> {
    let imageUrl: string | null = currentImageUrl;

    if (imageFile) {
      const newImageUrl = await StorageService.uploadImage(imageFile);
      if (!newImageUrl) return null;
      if (currentImageUrl) {
        await StorageService.deleteImage(currentImageUrl);
      }
      imageUrl = newImageUrl;
    } else if (currentImageUrl && !imageFile) {
      // This logic might need refinement based on how your UI handles image removal vs. no change
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ text, image_url: imageUrl, timestamp: new Date().toISOString() })
        .eq('id', id)
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('updatePost', error);
        return null;
      }
      return data as Post;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating post timed out.');
      } else {
        logSupabaseError('updatePost', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async deletePost(id: string, imageUrl: string | null): Promise<boolean> {
    if (imageUrl) {
      await StorageService.deleteImage(imageUrl);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('deletePost', error);
        return false;
      }
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Deleting post timed out.');
      } else {
        logSupabaseError('deletePost', err);
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchSubscriberCount(): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .in('subscription_status', ['trialing', 'active'])
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('fetchSubscriberCount', error);
        return 0;
      }
      return count || 0;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching subscriber count timed out.');
      } else {
        logSupabaseError('fetchSubscriberCount', err);
      }
      return 0;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchPreviousPost(currentPostTimestamp: string): Promise<Post | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .lt('timestamp', currentPostTimestamp)
        .order('timestamp', { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logSupabaseError('fetchPreviousPost', error);
        return null;
      }
      return data as Post;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching previous post timed out.');
      } else {
        logSupabaseError('fetchPreviousPost', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
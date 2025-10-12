import { supabase } from '@/integrations/supabase/client';
import { StorageService } from './StorageService';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import the timeout constant

export interface Post {
  id: string;
  text: string;
  image_url?: string;
  timestamp: string;
  admin_id: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  username: string | null; // Added username directly to Comment interface
  avatar_url: string | null; // Added avatar_url directly to Comment interface
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
        .abortSignal(controller.signal) // Moved abortSignal here
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
        .abortSignal(controller.signal) // Moved abortSignal here
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
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
        .abortSignal(controller.signal) // Moved abortSignal here
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
        .abortSignal(controller.signal) // Moved abortSignal here
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
        .abortSignal(controller.signal) // Moved abortSignal here
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
        .abortSignal(controller.signal); // Moved abortSignal here

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
        .abortSignal(controller.signal); // Moved abortSignal here

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

  // --- Likes functionality ---
  async addLike(postId: string, userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: userId })
        .abortSignal(controller.signal); // Moved abortSignal here

      if (error) {
        if (error.code === '23505') {
          return true;
        }
        logSupabaseError('addLike', error);
        return false;
      }
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Adding like timed out.');
      } else {
        logSupabaseError('addLike', err);
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async removeLike(postId: string, userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .abortSignal(controller.signal); // Moved abortSignal here

      if (error) {
        logSupabaseError('removeLike', error);
        return false;
      }
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Removing like timed out.');
      } else {
        logSupabaseError('removeLike', err);
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchLikesCount(postId: string): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { count, error } = await supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .eq('post_id', postId)
        .abortSignal(controller.signal); // Moved abortSignal here

      if (error) {
        logSupabaseError('fetchLikesCount', error);
        return 0;
      }
      return count || 0;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching likes count timed out.');
      } else {
        logSupabaseError('fetchLikesCount', err);
      }
      return 0;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async hasUserLiked(postId: string, userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .limit(1)
        .abortSignal(controller.signal); // Moved abortSignal here

      if (error) {
        logSupabaseError('hasUserLiked', error);
        return false;
      }
      return data && data.length > 0;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Checking user like status timed out.');
      } else {
        logSupabaseError('hasUserLiked', err);
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // --- Comments functionality ---
  async addComment(postId: string, userId: string, content: string): Promise<Comment | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, user_id: userId, content })
        .abortSignal(controller.signal) // Moved abortSignal here
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          updated_at,
          profiles (username, avatar_url)
        `)
        .single();

      if (error) {
        logSupabaseError('addComment', error);
        return null;
      }
      // Access username and avatar_url from the profiles object (or first element if it's an array)
      const profileData = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      return {
        id: data.id,
        post_id: data.post_id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        updated_at: data.updated_at,
        username: profileData?.username || null, 
        avatar_url: profileData?.avatar_url || null,
      } as Comment;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Adding comment timed out.');
      } else {
        logSupabaseError('addComment', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchComments(postId: string): Promise<Comment[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          updated_at,
          profiles (username, avatar_url)
        `)
        .eq('post_id', postId)
        .abortSignal(controller.signal) // Moved abortSignal here
        .order('created_at', { ascending: true });

      if (error) {
        logSupabaseError('fetchComments', error);
        return [];
      }
      return data.map(comment => {
        // Access username and avatar_url from the profiles object (or first element if it's an array)
        const profileData = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
        return {
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          username: profileData?.username || null, 
          avatar_url: profileData?.avatar_url || null,
        };
      }) as Comment[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching comments timed out.');
      } else {
        logSupabaseError('fetchComments', err);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async updateComment(commentId: string, content: string): Promise<Comment | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .abortSignal(controller.signal) // Moved abortSignal here
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          updated_at,
          profiles (username, avatar_url)
        `)
        .single();

      if (error) {
        logSupabaseError('updateComment', error);
        return null;
      }
      // Access username and avatar_url from the profiles object (or first element if it's an array)
      const profileData = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      return {
        id: data.id,
        post_id: data.post_id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        updated_at: data.updated_at,
        username: profileData?.username || null, 
        avatar_url: profileData?.avatar_url || null,
      } as Comment;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating comment timed out.');
      } else {
        logSupabaseError('updateComment', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async deleteComment(commentId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .abortSignal(controller.signal); // Moved abortSignal here

      if (error) {
        logSupabaseError('deleteComment', error);
        return false;
      }
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Deleting comment timed out.');
      } else {
        logSupabaseError('deleteComment', err);
      }
      return false;
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
        .lt('timestamp', currentPostTimestamp) // Get posts older than the current one
        .order('timestamp', { ascending: false }) // Order by most recent first
        .limit(1)
        .abortSignal(controller.signal) // Moved abortSignal here
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
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
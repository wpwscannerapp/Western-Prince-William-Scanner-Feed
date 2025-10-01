import { supabase } from '@/integrations/supabase/client';
import { StorageService } from './StorageService';
import { handleError } from '@/utils/errorHandler';

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
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);

    if (error) {
      logSupabaseError('fetchPosts', error);
      return [];
    }
    return data as Post[];
  },

  async fetchSinglePost(postId: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      logSupabaseError('fetchSinglePost', error);
      return null;
    }
    return data as Post;
  },

  async fetchNewPosts(lastTimestamp: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .gt('timestamp', lastTimestamp)
      .order('timestamp', { ascending: false });

    if (error) {
      logSupabaseError('fetchNewPosts', error);
      return [];
    }
    return data as Post[];
  },

  async createPost(text: string, imageFile: File | null, adminId: string): Promise<Post | null> {
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await StorageService.uploadImage(imageFile);
      if (!imageUrl) return null;
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({ text, image_url: imageUrl, admin_id: adminId })
      .select()
      .single();

    if (error) {
      logSupabaseError('createPost', error);
      return null;
    }
    return data as Post;
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


    const { data, error } = await supabase
      .from('posts')
      .update({ text, image_url: imageUrl, timestamp: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('updatePost', error);
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
      logSupabaseError('deletePost', error);
      return false;
    }
    return true;
  },

  async fetchSubscriberCount(): Promise<number> {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .in('subscription_status', ['trialing', 'active']);

    if (error) {
      logSupabaseError('fetchSubscriberCount', error);
      return 0;
    }
    return count || 0;
  },

  // --- Likes functionality ---
  async addLike(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('likes')
      .insert({ post_id: postId, user_id: userId });

    if (error) {
      if (error.code === '23505') {
        return true;
      }
      logSupabaseError('addLike', error);
      return false;
    }
    return true;
  },

  async removeLike(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      logSupabaseError('removeLike', error);
      return false;
    }
    return true;
  },

  async fetchLikesCount(postId: string): Promise<number> {
    const { count, error } = await supabase
      .from('likes')
      .select('id', { count: 'exact' })
      .eq('post_id', postId);

    if (error) {
      logSupabaseError('fetchLikesCount', error);
      return 0;
    }
    return count || 0;
  },

  async hasUserLiked(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      logSupabaseError('hasUserLiked', error);
      return false;
    }
    return data && data.length > 0;
  },

  // --- Comments functionality ---
  async addComment(postId: string, userId: string, content: string): Promise<Comment | null> {
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content })
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
    return {
      id: data.id,
      post_id: data.post_id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      username: data.profiles?.[0]?.username || null, // Access first element if profiles is an array
      avatar_url: data.profiles?.[0]?.avatar_url || null, // Access first element if profiles is an array
    } as Comment;
  },

  async fetchComments(postId: string): Promise<Comment[]> {
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
      .order('created_at', { ascending: true });

    if (error) {
      logSupabaseError('fetchComments', error);
      return [];
    }
    return data.map(comment => ({
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      username: comment.profiles?.[0]?.username || null, // Access first element if profiles is an array
      avatar_url: comment.profiles?.[0]?.avatar_url || null, // Access first element if profiles is an array
    })) as Comment[];
  },

  async updateComment(commentId: string, content: string): Promise<Comment | null> {
    const { data, error } = await supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
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
    return {
      id: data.id,
      post_id: data.post_id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      username: data.profiles?.[0]?.username || null, // Access first element if profiles is an array
      avatar_url: data.profiles?.[0]?.avatar_url || null, // Access first element if profiles is an array
    } as Comment;
  },

  async deleteComment(commentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      logSupabaseError('deleteComment', error);
      return false;
    }
    return true;
  },

  // Placeholder for fetching related posts
  async fetchRelatedPosts(currentPostId: string, limit: number = 3): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .neq('id', currentPostId) // Exclude the current post
        .order('timestamp', { ascending: false }) // Order by most recent
        .limit(limit);

      if (error) {
        logSupabaseError('fetchRelatedPosts', error);
        return [];
      }
      return data as Post[];
    } catch (err) {
      logSupabaseError('fetchRelatedPosts', err);
      return [];
    }
  },
};
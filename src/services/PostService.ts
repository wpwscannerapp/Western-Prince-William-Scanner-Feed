import { supabase } from '@/integrations/supabase/client'; // Updated import path
import { StorageService } from './StorageService'; // Import StorageService

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
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
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

  async fetchSinglePost(postId: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching single post:', error);
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
  },

  // --- Likes functionality ---
  async addLike(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('likes')
      .insert({ post_id: postId, user_id: userId });

    if (error) {
      // Ignore duplicate key error if user already liked
      if (error.code === '23505') { // Unique violation error code
        return true;
      }
      console.error('Error adding like:', error);
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
      console.error('Error removing like:', error);
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
      console.error('Error fetching likes count:', error);
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
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error checking if user liked post:', error);
      return false;
    }
    return !!data;
  },

  // --- Comments functionality ---
  async addComment(postId: string, userId: string, content: string): Promise<Comment | null> {
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content })
      .select('*, profiles(first_name, last_name, avatar_url)') // Select profile info
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return null;
    }
    return data as Comment;
  },

  async fetchComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(first_name, last_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
    return data as Comment[];
  },

  async updateComment(commentId: string, content: string): Promise<Comment | null> {
    const { data, error } = await supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('*, profiles(first_name, last_name, avatar_url)')
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return null;
    }
    return data as Comment;
  },

  async deleteComment(commentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
    return true;
  },
};
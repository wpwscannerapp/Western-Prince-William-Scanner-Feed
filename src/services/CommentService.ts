import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  username: string | null;
  avatar_url: string | null;
}

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

export const CommentService = {
  async addComment(postId: string, userId: string, content: string): Promise<Comment | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, user_id: userId, content })
        .abortSignal(controller.signal)
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
        .abortSignal(controller.signal)
        .order('created_at', { ascending: true });

      if (error) {
        logSupabaseError('fetchComments', error);
        return [];
      }
      return data.map(comment => {
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
        .abortSignal(controller.signal)
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
        .abortSignal(controller.signal);

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
};
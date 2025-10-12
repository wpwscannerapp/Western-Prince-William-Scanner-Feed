import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

export const LikeService = {
  async addLike(postId: string, userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: userId })
        .abortSignal(controller.signal);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation, means already liked
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
        .abortSignal(controller.signal);

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
        .abortSignal(controller.signal);

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
        .abortSignal(controller.signal);

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
};
"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

export interface Comment {
  id: string;
  incident_id: string;
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
  async addComment(incidentId: string, userId: string, content: string): Promise<Comment | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ incident_id: incidentId, user_id: userId, content })
        .abortSignal(controller.signal)
        .select(`
          id,
          incident_id,
          user_id,
          content,
          created_at,
          updated_at,
          profiles (username, avatar_url)
        `)
        .single();

      if (error) {
        logSupabaseError('addComment', error);
        AnalyticsService.trackEvent({ name: 'add_comment_failed', properties: { incidentId, userId, error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'comment_added', properties: { incidentId, userId } });
      const profileData = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      return {
        id: data.id,
        incident_id: data.incident_id,
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
        AnalyticsService.trackEvent({ name: 'add_comment_failed', properties: { incidentId, userId, error: 'timeout' } });
      } else {
        logSupabaseError('addComment', err);
        AnalyticsService.trackEvent({ name: 'add_comment_failed', properties: { incidentId, userId, error: err.message } });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchComments(incidentId: string): Promise<Comment[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          incident_id,
          user_id,
          content,
          created_at,
          updated_at,
          profiles (username, avatar_url)
        `)
        .eq('incident_id', incidentId)
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
          incident_id: comment.incident_id,
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
          incident_id,
          user_id,
          content,
          created_at,
          updated_at,
          profiles (username, avatar_url)
        `)
        .single();

      if (error) {
        logSupabaseError('updateComment', error);
        AnalyticsService.trackEvent({ name: 'update_comment_failed', properties: { commentId, error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'comment_updated', properties: { commentId } });
      const profileData = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      return {
        id: data.id,
        incident_id: data.incident_id,
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
        AnalyticsService.trackEvent({ name: 'update_comment_failed', properties: { commentId, error: 'timeout' } });
      } else {
        logSupabaseError('updateComment', err);
        AnalyticsService.trackEvent({ name: 'update_comment_failed', properties: { commentId, error: err.message } });
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
        AnalyticsService.trackEvent({ name: 'delete_comment_failed', properties: { commentId, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'comment_deleted', properties: { commentId } });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Deleting comment timed out.');
        AnalyticsService.trackEvent({ name: 'delete_comment_failed', properties: { commentId, error: 'timeout' } });
      } else {
        logSupabaseError('deleteComment', err);
        AnalyticsService.trackEvent({ name: 'delete_comment_failed', properties: { commentId, error: err.message } });
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
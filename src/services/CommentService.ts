"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from './AnalyticsService';
import { CommentInsert, CommentUpdate, CommentWithProfile } from '@/types/supabase';

export type Comment = CommentWithProfile; // Alias CommentWithProfile to Comment

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

/**
 * Recursively builds a nested comment tree from a flat list of comments.
 * @param comments A flat array of comments.
 * @param parentId The ID of the parent comment (null for top-level comments).
 * @returns A nested array of comments.
 */
const buildCommentTree = (comments: CommentWithProfile[], parentId: string | null = null): CommentWithProfile[] => {
  return comments
    .filter(comment => (comment.parent_comment_id || null) === parentId)
    .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())
    .map(comment => ({
      ...comment,
      replies: buildCommentTree(comments, comment.id),
    }));
};

export const CommentService = {
  async addComment(incidentId: string, userId: string, content: string, parentCommentId: string | null = null, category: 'user' | 'update' = 'user'): Promise<Comment | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const commentInsert: CommentInsert = { incident_id: incidentId, user_id: userId, content, parent_comment_id: parentCommentId, category };
      const { data, error } = await supabase
        .from('comments')
        .insert(commentInsert)
        .abortSignal(controller.signal)
        .select(`
          id,
          incident_id,
          user_id,
          content,
          created_at,
          updated_at,
          parent_comment_id,
          category,
          profiles (username, avatar_url)
        `)
        .single();

      if (error) {
        logSupabaseError('addComment', error);
        AnalyticsService.trackEvent({ name: 'add_comment_failed', properties: { incidentId, userId, parentCommentId, category, error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'comment_added', properties: { incidentId, userId, isReply: !!parentCommentId, category } });
      const profileData = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      return {
        id: data.id,
        incident_id: data.incident_id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        updated_at: data.updated_at,
        parent_comment_id: data.parent_comment_id,
        category: data.category,
        profiles: profileData ? { username: profileData.username, avatar_url: profileData.avatar_url } : null,
        replies: [],
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

  async fetchCommentsCount(incidentId: string, category: 'user' | 'update' = 'user'): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { count, error } = await supabase
        .from('comments')
        .select('id', { count: 'exact' })
        .eq('incident_id', incidentId)
        .eq('category', category)
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('fetchCommentsCount', error);
        return 0;
      }
      return count || 0;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching comments count timed out.');
      } else {
        logSupabaseError('fetchCommentsCount', err);
      }
      return 0;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchComments(incidentId: string, category: 'user' | 'update' = 'user'): Promise<Comment[]> {
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
          parent_comment_id,
          category,
          profiles (username, avatar_url)
        `)
        .eq('incident_id', incidentId)
        .eq('category', category)
        .abortSignal(controller.signal)
        .order('created_at', { ascending: true });

      if (error) {
        logSupabaseError('fetchComments', error);
        return [];
      }

      const flatComments = data.map(comment => {
        const profileData = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
        return {
          id: comment.id,
          incident_id: comment.incident_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          parent_comment_id: comment.parent_comment_id,
          category: comment.category,
          profiles: profileData ? { username: profileData.username, avatar_url: profileData.avatar_url } : null,
        };
      }) as CommentWithProfile[];

      // Build the nested tree structure
      return buildCommentTree(flatComments, null);

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
      const commentUpdate: CommentUpdate = { content, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('comments')
        .update(commentUpdate)
        .eq('id', commentId)
        .abortSignal(controller.signal)
        .select(`
          id,
          incident_id,
          user_id,
          content,
          created_at,
          updated_at,
          parent_comment_id,
          category,
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
        parent_comment_id: data.parent_comment_id,
        category: data.category,
        profiles: profileData ? { username: profileData.username, avatar_url: profileData.avatar_url } : null,
        replies: [],
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
        // Deleting a parent comment will cascade delete all replies due to the foreign key constraint ON DELETE CASCADE
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
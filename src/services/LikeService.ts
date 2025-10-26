"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

export const LikeService = {
  async addLike(incidentId: string, userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('likes')
        .insert({ incident_id: incidentId, user_id: userId })
        .abortSignal(controller.signal);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation, means already liked
          AnalyticsService.trackEvent({ name: 'like_already_exists', properties: { incidentId, userId } });
          return true;
        }
        logSupabaseError('addLike', error);
        AnalyticsService.trackEvent({ name: 'add_like_failed', properties: { incidentId, userId, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'like_added', properties: { incidentId, userId } });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Adding like timed out.');
        AnalyticsService.trackEvent({ name: 'add_like_failed', properties: { incidentId, userId, error: 'timeout' } });
      } else {
        logSupabaseError('addLike', err);
        AnalyticsService.trackEvent({ name: 'add_like_failed', properties: { incidentId, userId, error: err.message } });
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async removeLike(incidentId: string, userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('incident_id', incidentId)
        .eq('user_id', userId)
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('removeLike', error);
        AnalyticsService.trackEvent({ name: 'remove_like_failed', properties: { incidentId, userId, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'like_removed', properties: { incidentId, userId } });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Removing like timed out.');
        AnalyticsService.trackEvent({ name: 'remove_like_failed', properties: { incidentId, userId, error: 'timeout' } });
      } else {
        logSupabaseError('removeLike', err);
        AnalyticsService.trackEvent({ name: 'remove_like_failed', properties: { incidentId, userId, error: err.message } });
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchLikesCount(incidentId: string): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { count, error } = await supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .eq('incident_id', incidentId)
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

  async hasUserLiked(incidentId: string, userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('incident_id', incidentId)
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
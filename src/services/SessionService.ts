"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { Session } from '@supabase/supabase-js';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

export interface UserSession {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  expires_at: string;
}

export const SessionService = {
  async createSession(session: Session, sessionId: string): Promise<UserSession | null> {
    if (!session.user || !session.expires_in) {
      handleError(null, 'Invalid session data provided for creation.');
      AnalyticsService.trackEvent({ name: 'create_session_failed', properties: { reason: 'invalid_session_data' } });
      return null;
    }
    const expiresAt = new Date(Date.now() + session.expires_in * 1000).toISOString();
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .upsert(
          { user_id: session.user.id, session_id: sessionId, expires_at: expiresAt },
          { onConflict: 'session_id' }
        )
        .select()
        .single();

      if (error) {
        handleError(error, `Failed to create or update user session: ${error.message}`);
        AnalyticsService.trackEvent({ name: 'create_session_failed', properties: { userId: session.user.id, error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'session_created_or_updated', properties: { userId: session.user.id, sessionId } });
      return data as UserSession;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while creating user session.');
      AnalyticsService.trackEvent({ name: 'create_session_unexpected_error', properties: { userId: session.user.id, error: (err as Error).message } });
      return null;
    }
  },

  async deleteSession(userId: string | undefined, sessionId: string): Promise<boolean> {
    if (!userId) {
      if (import.meta.env.DEV) {
        console.warn('SessionService: No user ID provided for session deletion, skipping database deletion.');
      }
      AnalyticsService.trackEvent({ name: 'delete_session_skipped', properties: { sessionId, reason: 'no_user_id' } });
      return true;
    }

    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) {
        handleError(error, 'Failed to delete user session.');
        AnalyticsService.trackEvent({ name: 'delete_session_failed', properties: { userId, sessionId, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'session_deleted', properties: { userId, sessionId } });
      return true;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while deleting user session.');
      AnalyticsService.trackEvent({ name: 'delete_session_unexpected_error', properties: { userId, sessionId, error: (err as Error).message } });
      return false;
    }
  },

  async deleteAllSessionsForUser(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      if (import.meta.env.DEV) {
        console.warn('SessionService: No authenticated user or user mismatch, skipping database all sessions deletion.');
      }
      AnalyticsService.trackEvent({ name: 'delete_all_sessions_skipped', properties: { targetUserId: userId, reason: 'auth_mismatch' } });
      return true;
    }

    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        handleError(error, 'Failed to delete all user sessions.');
        AnalyticsService.trackEvent({ name: 'delete_all_sessions_failed', properties: { userId, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'all_sessions_deleted', properties: { userId } });
      return true;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while deleting all user sessions.');
      AnalyticsService.trackEvent({ name: 'delete_all_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return false;
    }
  },

  async countActiveSessions(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_sessions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        handleError(error, 'Failed to count active sessions.');
        AnalyticsService.trackEvent({ name: 'count_active_sessions_failed', properties: { userId, error: error.message } });
        return 0;
      }
      return count || 0;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while counting active sessions.');
      AnalyticsService.trackEvent({ name: 'count_active_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return 0;
    }
  },

  async deleteOldestSessions(userId: string, limit: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      if (import.meta.env.DEV) {
        console.warn('SessionService: No authenticated user or user mismatch, skipping database oldest sessions deletion.');
      }
      AnalyticsService.trackEvent({ name: 'delete_oldest_sessions_skipped', properties: { targetUserId: userId, reason: 'auth_mismatch' } });
      return true;
    }

    try {
      const { data: sessions, error: fetchError } = await supabase
        .from('user_sessions')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        handleError(fetchError, 'Failed to fetch sessions for deletion.');
        AnalyticsService.trackEvent({ name: 'delete_oldest_sessions_fetch_failed', properties: { userId, error: fetchError.message } });
        return false;
      }

      if (sessions && sessions.length >= limit) {
        const sessionsToDelete = sessions.slice(0, sessions.length - limit + 1);
        const idsToDelete = sessionsToDelete.map(s => s.id);

        const { error: deleteError } = await supabase
          .from('user_sessions')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          handleError(deleteError, 'Failed to delete oldest sessions.');
          AnalyticsService.trackEvent({ name: 'delete_oldest_sessions_failed', properties: { userId, count: idsToDelete.length, error: deleteError.message } });
          return false;
        }
        AnalyticsService.trackEvent({ name: 'oldest_sessions_deleted', properties: { userId, count: idsToDelete.length } });
      }
      return true;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while deleting oldest sessions.');
      AnalyticsService.trackEvent({ name: 'delete_oldest_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return false;
    }
  },

  async isValidSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (error) {
        handleError(error, 'Failed to validate session.');
        AnalyticsService.trackEvent({ name: 'is_valid_session_failed', properties: { userId, sessionId, error: error.message } });
        return false;
      }
      const isValid = data !== null && data.length > 0;
      AnalyticsService.trackEvent({ name: 'session_validated', properties: { userId, sessionId, isValid } });
      return isValid;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while validating session.');
      AnalyticsService.trackEvent({ name: 'is_valid_session_unexpected_error', properties: { userId, sessionId, error: (err as Error).message } });
      return false;
    }
  },
};
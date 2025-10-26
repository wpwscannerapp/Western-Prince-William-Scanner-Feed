"use client";

import { handleError } from '@/utils/errorHandler';
import { Session } from '@supabase/supabase-js';
import { NetlifyClient } from '@/integrations/netlify/client'; // Import the new NetlifyClient
import { AnalyticsService } from './AnalyticsService';

export interface UserSession {
  id: string; // This will be the sessionId
  user_id: string;
  session_id: string;
  created_at: string;
  expires_at: string;
}

const logError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
  if (import.meta.env.DEV) {
    console.error(`SessionService Error in ${functionName}:`, error);
  }
};

export const SessionService = {
  async createSession(session: Session, sessionId: string): Promise<UserSession | null> {
    if (!session.user || !session.expires_in) {
      logError('createSession', 'Invalid session data provided for creation.');
      AnalyticsService.trackEvent({ name: 'create_session_failed', properties: { reason: 'invalid_session_data' } });
      return null;
    }

    const expiresAtDate = new Date(Date.now() + session.expires_in * 1000);
    const expiresAtISO = expiresAtDate.toISOString();
    const createdAtISO = new Date().toISOString();

    try {
      const { data, error } = await NetlifyClient.invoke<{ success: boolean }>('session-manager', {
        action: 'createSession',
        payload: {
          sessionId,
          userId: session.user.id,
          expiresAt: expiresAtISO,
          expiresIn: session.expires_in,
        },
      });

      if (error || !data?.success) {
        logError('createSession', error || 'Netlify Function reported failure.');
        AnalyticsService.trackEvent({ name: 'create_session_failed', properties: { userId: session.user.id, error: error || 'Netlify Function reported failure.' } });
        return null;
      }

      AnalyticsService.trackEvent({ name: 'session_created_or_updated', properties: { userId: session.user.id, sessionId } });
      return {
        id: sessionId,
        user_id: session.user.id,
        session_id: sessionId,
        created_at: createdAtISO,
        expires_at: expiresAtISO,
      };
    } catch (err) {
      logError('createSession', err);
      AnalyticsService.trackEvent({ name: 'create_session_unexpected_error', properties: { userId: session.user.id, error: (err as Error).message } });
      return null;
    }
  },

  async deleteSession(userId: string | undefined, sessionId: string): Promise<boolean> {
    if (!userId) {
      if (import.meta.env.DEV) {
        console.warn('SessionService: No user ID provided for session deletion, skipping blob deletion.');
      }
      AnalyticsService.trackEvent({ name: 'delete_session_skipped', properties: { sessionId, reason: 'no_user_id' } });
      return true;
    }

    try {
      const { data, error } = await NetlifyClient.invoke<{ success: boolean }>('session-manager', {
        action: 'deleteSession',
        payload: { sessionId },
      });

      if (error || !data?.success) {
        logError('deleteSession', error || 'Netlify Function reported failure.');
        AnalyticsService.trackEvent({ name: 'delete_session_failed', properties: { userId, sessionId, error: error || 'Netlify Function reported failure.' } });
        return false;
      }

      AnalyticsService.trackEvent({ name: 'session_deleted', properties: { userId, sessionId } });
      return true;
    } catch (err) {
      logError('deleteSession', err);
      AnalyticsService.trackEvent({ name: 'delete_session_unexpected_error', properties: { userId, sessionId, error: (err as Error).message } });
      return false;
    }
  },

  async deleteAllSessionsForUser(userId: string): Promise<boolean> {
    try {
      const { data, error } = await NetlifyClient.invoke<{ success: boolean }>('session-manager', {
        action: 'deleteAllSessionsForUser',
        payload: { userId },
      });

      if (error || !data?.success) {
        logError('deleteAllSessionsForUser', error || 'Netlify Function reported failure.');
        AnalyticsService.trackEvent({ name: 'delete_all_sessions_failed', properties: { userId, error: error || 'Netlify Function reported failure.' } });
        return false;
      }

      AnalyticsService.trackEvent({ name: 'all_sessions_deleted', properties: { userId } });
      return true;
    } catch (err) {
      logError('deleteAllSessionsForUser', err);
      AnalyticsService.trackEvent({ name: 'delete_all_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return false;
    }
  },

  async countActiveSessions(userId: string): Promise<number> {
    try {
      const { data, error } = await NetlifyClient.invoke<{ count: number }>('session-manager', {
        action: 'countActiveSessions',
        payload: { userId },
      });

      if (error) {
        logError('countActiveSessions', error);
        AnalyticsService.trackEvent({ name: 'count_active_sessions_failed', properties: { userId, error } });
        return 0;
      }

      AnalyticsService.trackEvent({ name: 'count_active_sessions_fetched', properties: { userId, count: data?.count || 0 } });
      return data?.count || 0;
    } catch (err) {
      logError('countActiveSessions', err);
      AnalyticsService.trackEvent({ name: 'count_active_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return 0;
    }
  },

  async deleteOldestSessions(userId: string, limit: number): Promise<boolean> {
    try {
      const { data, error } = await NetlifyClient.invoke<{ success: boolean }>('session-manager', {
        action: 'deleteOldestSessions',
        payload: { userId, limit },
      });

      if (error || !data?.success) {
        logError('deleteOldestSessions', error || 'Netlify Function reported failure.');
        AnalyticsService.trackEvent({ name: 'delete_oldest_sessions_failed', properties: { userId, error: error || 'Netlify Function reported failure.' } });
        return false;
      }

      AnalyticsService.trackEvent({ name: 'oldest_sessions_deleted', properties: { userId } });
      return true;
    } catch (err) {
      logError('deleteOldestSessions', err);
      AnalyticsService.trackEvent({ name: 'delete_oldest_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return false;
    }
  },

  async isValidSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await NetlifyClient.invoke<{ isValid: boolean }>('session-manager', {
        action: 'isValidSession',
        payload: { userId, sessionId },
      });

      if (error) {
        logError('isValidSession', error);
        AnalyticsService.trackEvent({ name: 'session_validated_failed', properties: { userId, sessionId, error } });
        return false;
      }

      AnalyticsService.trackEvent({ name: 'session_validated', properties: { userId, sessionId, isValid: data?.isValid || false } });
      return data?.isValid || false;
    } catch (err) {
      logError('isValidSession', err);
      AnalyticsService.trackEvent({ name: 'is_valid_session_unexpected_error', properties: { userId, sessionId, error: (err as Error).message } });
      return false;
    }
  },
};
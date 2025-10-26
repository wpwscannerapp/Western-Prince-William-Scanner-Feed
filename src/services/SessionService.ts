"use client";

import { getStore } from '@netlify/blobs';
import { handleError } => '@/utils/errorHandler';
import { Session } from '@supabase/supabase-js';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

// Define the structure of a session stored in Netlify Blobs
export interface BlobSessionData {
  userId: string;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

export interface UserSession {
  id: string; // This will be the sessionId
  user_id: string;
  session_id: string;
  created_at: string;
  expires_at: string;
}

const sessionsStore = getStore('user_sessions');

const logBlobError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
  if (import.meta.env.DEV) {
    console.error(`Netlify Blobs Error in ${functionName}:`, error);
  }
};

export const SessionService = {
  async createSession(session: Session, sessionId: string): Promise<UserSession | null> {
    if (!session.user || !session.expires_in) {
      handleError(null, 'Invalid session data provided for creation.');
      AnalyticsService.trackEvent({ name: 'create_session_failed', properties: { reason: 'invalid_session_data' } });
      return null;
    }

    const expiresAtDate = new Date(Date.now() + session.expires_in * 1000);
    const expiresAtISO = expiresAtDate.toISOString();
    const createdAtISO = new Date().toISOString();

    const blobData: BlobSessionData = {
      userId: session.user.id,
      expiresAt: expiresAtISO,
      createdAt: createdAtISO,
    };

    try {
      // Set the blob with the sessionId as key and blobData as value
      // The ttl is in seconds for Netlify Blobs
      await sessionsStore.setJSON(sessionId, blobData, { ttl: session.expires_in });

      AnalyticsService.trackEvent({ name: 'session_created_or_updated', properties: { userId: session.user.id, sessionId } });
      return {
        id: sessionId,
        user_id: session.user.id,
        session_id: sessionId,
        created_at: createdAtISO,
        expires_at: expiresAtISO,
      };
    } catch (err) {
      logBlobError('createSession', err);
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
      await sessionsStore.delete(sessionId);
      AnalyticsService.trackEvent({ name: 'session_deleted', properties: { userId, sessionId } });
      return true;
    } catch (err) {
      logBlobError('deleteSession', err);
      AnalyticsService.trackEvent({ name: 'delete_session_unexpected_error', properties: { userId, sessionId, error: (err as Error).message } });
      return false;
    }
  },

  // NOTE: This operation can be inefficient for a large number of sessions
  // as it requires listing all keys and fetching each blob.
  async deleteAllSessionsForUser(userId: string): Promise<boolean> {
    try {
      const { blobs } = await sessionsStore.list();
      const deletePromises: Promise<void>[] = [];

      for (const blob of blobs) {
        const blobData = await sessionsStore.getJson<BlobSessionData>(blob.key);
        if (blobData && blobData.userId === userId) {
          deletePromises.push(sessionsStore.delete(blob.key));
        }
      }
      await Promise.all(deletePromises);
      AnalyticsService.trackEvent({ name: 'all_sessions_deleted', properties: { userId, count: deletePromises.length } });
      return true;
    } catch (err) {
      logBlobError('deleteAllSessionsForUser', err);
      AnalyticsService.trackEvent({ name: 'delete_all_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return false;
    }
  },

  // NOTE: This operation can be inefficient for a large number of sessions
  // as it requires listing all keys and fetching each blob.
  async countActiveSessions(userId: string): Promise<number> {
    try {
      const { blobs } = await sessionsStore.list();
      let count = 0;
      const now = new Date();

      for (const blob of blobs) {
        const blobData = await sessionsStore.getJson<BlobSessionData>(blob.key);
        if (blobData && blobData.userId === userId && new Date(blobData.expiresAt) > now) {
          count++;
        }
      }
      AnalyticsService.trackEvent({ name: 'count_active_sessions_fetched', properties: { userId, count } });
      return count;
    } catch (err) {
      logBlobError('countActiveSessions', err);
      AnalyticsService.trackEvent({ name: 'count_active_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return 0;
    }
  },

  // NOTE: This operation can be inefficient for a large number of sessions
  // as it requires listing all keys and fetching each blob.
  async deleteOldestSessions(userId: string, limit: number): Promise<boolean> {
    try {
      const { blobs } = await sessionsStore.list();
      const userSessions: { key: string; data: BlobSessionData }[] = [];

      for (const blob of blobs) {
        const blobData = await sessionsStore.getJson<BlobSessionData>(blob.key);
        if (blobData && blobData.userId === userId) {
          userSessions.push({ key: blob.key, data: blobData });
        }
      }

      if (userSessions.length >= limit) {
        userSessions.sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
        const sessionsToDelete = userSessions.slice(0, userSessions.length - limit + 1);
        const deletePromises = sessionsToDelete.map(s => sessionsStore.delete(s.key));
        await Promise.all(deletePromises);
        AnalyticsService.trackEvent({ name: 'oldest_sessions_deleted', properties: { userId, count: deletePromises.length } });
      }
      return true;
    } catch (err) {
      logBlobError('deleteOldestSessions', err);
      AnalyticsService.trackEvent({ name: 'delete_oldest_sessions_unexpected_error', properties: { userId, error: (err as Error).message } });
      return false;
    }
  },

  async isValidSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const blobData = await sessionsStore.getJson<BlobSessionData>(sessionId);
      const isValid = blobData !== null && blobData.userId === userId && new Date(blobData.expiresAt) > new Date();
      AnalyticsService.trackEvent({ name: 'session_validated', properties: { userId, sessionId, isValid } });
      return isValid;
    } catch (err) {
      logBlobError('isValidSession', err);
      AnalyticsService.trackEvent({ name: 'is_valid_session_unexpected_error', properties: { userId, sessionId, error: (err as Error).message } });
      return false;
    }
  },
};
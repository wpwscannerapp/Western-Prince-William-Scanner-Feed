import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';

export interface UserSession {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  expires_at: string;
}

export const SessionService = {
  async createSession(userId: string, sessionId: string, expiresInSeconds: number): Promise<UserSession | null> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({ user_id: userId, session_id: sessionId, expires_at: expiresAt })
        .select()
        .single();

      if (error) {
        handleError(error, 'Failed to create user session.');
        return null;
      }
      return data as UserSession;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while creating user session.');
      return null;
    }
  },

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        handleError(error, 'Failed to delete user session.');
        return false;
      }
      return true;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while deleting user session.');
      return false;
    }
  },

  async deleteAllSessionsForUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        handleError(error, 'Failed to delete all user sessions.');
        return false;
      }
      return true;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while deleting all user sessions.');
      return false;
    }
  },

  async countActiveSessions(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_sessions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString()); // Only count sessions that haven't expired

      if (error) {
        handleError(error, 'Failed to count active sessions.');
        return 0;
      }
      return count || 0;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while counting active sessions.');
      return 0;
    }
  },

  async deleteOldestSessions(userId: string, limit: number): Promise<boolean> {
    try {
      const { data: sessions, error: fetchError } = await supabase
        .from('user_sessions')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }); // Get oldest first

      if (fetchError) {
        handleError(fetchError, 'Failed to fetch sessions for deletion.');
        return false;
      }

      if (sessions && sessions.length >= limit) {
        const sessionsToDelete = sessions.slice(0, sessions.length - limit + 1); // Keep 'limit - 1' sessions
        const idsToDelete = sessionsToDelete.map(s => s.id);

        const { error: deleteError } = await supabase
          .from('user_sessions')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          handleError(deleteError, 'Failed to delete oldest sessions.');
          return false;
        }
      }
      return true;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while deleting oldest sessions.');
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
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        handleError(error, 'Failed to validate session.');
        return false;
      }
      return !!data; // If data exists, session is valid
    } catch (err) {
      handleError(err, 'An unexpected error occurred while validating session.');
      return false;
    }
  },
};
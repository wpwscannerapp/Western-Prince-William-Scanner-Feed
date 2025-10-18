import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import SUPABASE_API_TIMEOUT

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  subscription_status: string;
  role: string;
  username: string | null; // Added username
  updated_at: string;
}

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

export const ProfileService = {
  async fetchProfile(userId: string): Promise<Profile | null> {
    console.log(`ProfileService: Attempting to fetch profile for user ID: ${userId}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`ProfileService: Fetch profile for user ID ${userId} timed out after ${SUPABASE_API_TIMEOUT / 1000}s.`);
      controller.abort();
    }, SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          console.error(`ProfileService: No profile found for user ID: ${userId}. This user might not have a profile entry.`);
          return null;
        }
        logSupabaseError('fetchProfile', error);
        return null;
      }
      console.log(`ProfileService: Successfully fetched profile for user ID: ${userId}. Role: ${data.role}`);
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`ProfileService: Fetch profile for user ID ${userId} aborted due to timeout.`);
        // Explicitly re-throw a generic error for consistency, which useIsAdmin will catch
        throw new Error('Request timed out');
      } else {
        logSupabaseError('fetchProfile', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      console.log(`ProfileService: Fetch profile for user ID ${userId} finished.`);
    }
  },

  async updateProfile(
    userId: string,
    updates: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null; username?: string | null } // Added username to updates
  ): Promise<Profile | null> {
    console.log(`ProfileService: Attempting to update profile for user ID: ${userId}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`ProfileService: Update profile for user ID ${userId} timed out after ${SUPABASE_API_TIMEOUT / 1000}s.`);
      controller.abort();
    }, SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('updateProfile', error);
        return null;
      }
      console.log(`ProfileService: Successfully updated profile for user ID: ${userId}.`);
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`ProfileService: Update profile for user ID ${userId} aborted due to timeout.`);
        handleError(new Error('Request timed out'), 'Updating profile timed out.');
      } else {
        logSupabaseError('updateProfile', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      console.log(`ProfileService: Update profile for user ID ${userId} finished.`);
    }
  },
};
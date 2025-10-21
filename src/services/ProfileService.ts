import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  subscription_status: string;
  role: string;
  username: string | null;
  updated_at: string;
}

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

export class ProfileService {
  static async ensureProfileExists(userId: string, session: Session | null): Promise<boolean> {
    if (!session) {
      console.warn(`ProfileService: ensureProfileExists for user ID: ${userId} - No session provided. Aborting.`);
      handleError(null, 'No active session to ensure profile exists.');
      return false;
    }
    console.log(`ProfileService: ensureProfileExists for user ID: ${userId}. Session present.`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 1000; // 1 second

    try {
      for (let i = 0; i < MAX_RETRIES; i++) {
        console.log(`ProfileService: ensureProfileExists - Attempting to select profile for ${userId} (Retry ${i + 1}/${MAX_RETRIES}).`);
        const { data, error: selectError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .abortSignal(controller.signal)
          .limit(1); // Changed from maybeSingle()

        console.log(`ProfileService: ensureProfileExists - Supabase response for select (Retry ${i + 1}):`, { data, selectError });

        if (selectError) {
          logSupabaseError('ensureProfileExists - select', selectError);
          handleError(selectError, 'Failed to check for existing profile.');
          return false;
        }

        if (data && data.length > 0) {
          console.log(`ProfileService: Profile already exists for ${userId} after ${i + 1} attempts.`);
          return true;
        }

        console.log(`ProfileService: No existing profile found for ${userId} on attempt ${i + 1}. Retrying in ${RETRY_DELAY_MS}ms.`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }

      console.warn(`ProfileService: Failed to find profile for ${userId} after ${MAX_RETRIES} retries. The 'handle_new_user' trigger might have failed or is severely delayed.`);
      handleError(null, 'User profile could not be loaded. Please try logging out and back in.');
      return false; // Indicate that the profile was not found/ensured by this call
    } catch (err: any) {
      console.error(`ProfileService: ensureProfileExists - Caught error:`, err);
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Ensuring profile existence timed out.');
      } else {
        logSupabaseError('ensureProfileExists', err);
        handleError(err, 'An unexpected error occurred while ensuring profile exists.');
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
      console.log(`ProfileService: Exiting ensureProfileExists for user ID: ${userId}.`);
    }
  }

  static async fetchProfile(userId: string, session: Session | null): Promise<Profile | null> {
    if (!session) {
      console.warn(`ProfileService: fetchProfile for user ID: ${userId} - No session provided. Returning null.`);
      return null;
    }
    console.log(`ProfileService: fetchProfile for user ID: ${userId}. Session present.`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      console.log(`ProfileService: fetchProfile - Attempting Supabase select for profile ${userId}.`);
      const query = supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, subscription_status, role, username, updated_at')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .limit(1); // Changed from maybeSingle()
      
      console.log('ProfileService: fetchProfile - Query object created, awaiting response...');
      const { data, error } = await query;
      console.log('ProfileService: fetchProfile - Supabase query awaited. Result:', { data, error });

      if (error) {
        logSupabaseError('fetchProfile', error);
        throw error;
      }
      if (!data || data.length === 0) { // Check data.length
        console.log(`ProfileService: fetchProfile - No profile found for ${userId}.`);
        return null;
      }
      console.log(`ProfileService: fetchProfile - Profile data found:`, data[0]); // Access first element
      return data[0] as Profile; // Return first element
    } catch (err: any) {
      console.error(`ProfileService: fetchProfile - Caught an error:`, err);
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching profile timed out.');
      } else {
        logSupabaseError('fetchProfile', err);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      console.log(`ProfileService: Exiting fetchProfile for user ID: ${userId}.`);
    }
  }

  static async updateProfile(
    userId: string,
    updates: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null; username?: string | null }
  ): Promise<Profile | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

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
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating profile timed out.');
      } else {
        logSupabaseError('updateProfile', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
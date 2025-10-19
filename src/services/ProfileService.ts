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
      console.log(`ProfileService: Executing Supabase query for user ID: ${userId}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle(); // Use maybeSingle to return null if no row is found

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          console.warn(`ProfileService: No profile found for user ID: ${userId}. This user might not have a profile entry.`);
          return null;
        }
        logSupabaseError('fetchProfile', error);
        throw error; // Re-throw to be caught by useIsAdmin
      }
      if (!data) {
        console.warn(`ProfileService: No profile data returned for user ID: ${userId} (maybeSingle returned null).`);
        return null;
      }
      console.log(`ProfileService: Successfully fetched profile for user ID: ${userId}. Role: ${data.role}`);
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`ProfileService: Fetch profile for user ID ${userId} aborted due to timeout.`);
        handleError(new Error('Request timed out'), 'Fetching profile timed out.');
      } else {
        console.error(`ProfileService: Caught error during fetchProfile for user ID ${userId}:`, err);
        logSupabaseError('fetchProfile', err);
      }
      throw err; // Re-throw to ensure useIsAdmin's catch block is hit
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
        .abortSignal(controller.signal) // Moved abortSignal here
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

  async ensureProfileExists(userId: string): Promise<boolean> {
    console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Starting check/upsert process.`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`ProfileService: ensureProfileExists for user ID ${userId} timed out after ${SUPABASE_API_TIMEOUT / 1000}s.`);
      controller.abort();
    }, SUPABASE_API_TIMEOUT);

    try {
      // First, check if the profile already exists
      console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Checking for existing profile.`);
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      // --- NEW LOG HERE ---
      console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Select query completed. Data: ${existingProfile ? 'found' : 'not found'}, Error: ${selectError ? selectError.message : 'none'}`);

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        logSupabaseError('ensureProfileExists - select', selectError);
        return false;
      }

      if (existingProfile) {
        console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Profile already exists. Skipping upsert.`);
        return true;
      }

      // If no profile exists, proceed with upsert to create it
      console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - No profile found, executing upsert to create.`);
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, subscription_status: 'free', role: 'user' }, // Default values
          { onConflict: 'id' }
        )
        .abortSignal(controller.signal);

      if (upsertError) {
        logSupabaseError('ensureProfileExists - upsert', upsertError);
        return false;
      }
      console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Upsert query completed successfully.`);
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`ProfileService: ensureProfileExists for user ID ${userId} aborted due to timeout.`);
        handleError(new Error('Request timed out'), 'Ensuring profile existence timed out.');
      } else {
        console.error(`ProfileService: Caught unexpected error during ensureProfileExists for user ID ${userId}:`, err);
        logSupabaseError('ensureProfileExists', err);
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
      console.log(`ProfileService: ensureProfileExists for user ID ${userId} - Process finished.`);
    }
  },
};
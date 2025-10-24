import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';

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
  static async ensureProfileExists(userId: string): Promise<boolean> {
    console.log(`ProfileService: ensureProfileExists called for userId: ${userId}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`ProfileService: ensureProfileExists for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
    }, SUPABASE_API_TIMEOUT);

    try {
      console.log(`ProfileService: ensureProfileExists - Attempting to select profile for ${userId}.`);
      const { data, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();
      console.log(`ProfileService: ensureProfileExists - Supabase select query completed. Data:`, data, `Error:`, selectError);

      if (selectError) {
        if (selectError.code === 'PGRST116') { // No rows found
          console.log(`ProfileService: No existing profile found for ${userId}. Attempting to insert a default profile.`);
          
          // Removed supabase.auth.getUser() and role determination based on email.
          // Rely on the database trigger (handle_new_user) for initial role assignment,
          // or the table's default value if the trigger is not active/fails.
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              first_name: null,
              last_name: null,
              avatar_url: null,
              subscription_status: 'free',
              username: null,
              updated_at: new Date().toISOString(),
            })
            .abortSignal(controller.signal);
          console.log(`ProfileService: ensureProfileExists - Supabase insert query completed. Error:`, insertError);

          if (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation, means profile was created concurrently
              console.warn(`ProfileService: Profile for ${userId} was created concurrently. Ignoring insert error.`);
              return true;
            }
            logSupabaseError('ensureProfileExists - insert', insertError);
            throw insertError; // Throw error
          }
          console.log(`ProfileService: Default profile created for ${userId}.`);
          return true;
        }
        logSupabaseError('ensureProfileExists - select', selectError);
        throw selectError; // Throw error
      }

      console.log(`ProfileService: Profile already exists for ${userId}.`);
      return true;
    } catch (err: any) {
      console.error(`ProfileService: ensureProfileExists - Caught error:`, err);
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Ensuring profile existence timed out.');
        throw new Error('Ensuring profile existence timed out.'); // Re-throw for upstream
      } else {
        logSupabaseError('ensureProfileExists', err);
        throw err; // Re-throw original error
      }
    } finally {
      clearTimeout(timeoutId);
      console.log(`ProfileService: Exiting ensureProfileExists for user ID: ${userId}.`);
    }
  }

  static async fetchProfile(userId: string): Promise<Profile | null> {
    console.log(`ProfileService: fetchProfile called for userId: ${userId}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`ProfileService: fetchProfile for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
    }, SUPABASE_API_TIMEOUT);

    try {
      console.log(`ProfileService: fetchProfile - Attempting Supabase select for profile ${userId}.`);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, subscription_status, role, username, updated_at')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();
      console.log('ProfileService: fetchProfile - Supabase select query completed. Data:', data, 'Error:', error);

      if (error) {
        logSupabaseError('fetchProfile', error);
        throw error;
      }
      if (!data) {
        console.log(`ProfileService: fetchProfile - No profile data returned for ${userId}. This is unexpected.`);
        return null;
      }
      console.log(`ProfileService: fetchProfile - Profile data found:`, data);
      return data as Profile;
    } catch (err: any) {
      console.error(`ProfileService: fetchProfile - Caught error:`, err);
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching profile timed out.');
        throw new Error('Fetching profile timed out.'); // Re-throw for upstream
      } else {
        // Log the specific Supabase error code if available
        const errorMessage = err.code ? `Supabase Error (${err.code}): ${err.message}` : err.message;
        handleError(err, `Failed to fetch profile: ${errorMessage}`);
        throw err; // Re-throw original error
      }
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
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`ProfileService: updateProfile for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
    }, SUPABASE_API_TIMEOUT);

    try {
      console.log(`ProfileService: updateProfile - Attempting Supabase update for profile ${userId}.`);
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .abortSignal(controller.signal)
        .select()
        .single();
      console.log('ProfileService: updateProfile - Supabase update query completed. Data:', data, 'Error:', error);

      if (error) {
        logSupabaseError('updateProfile', error);
        throw error; // Throw error
      }
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating profile timed out.');
        throw new Error('Updating profile timed out.'); // Re-throw for upstream
      } else {
        logSupabaseError('updateProfile', err);
        throw err; // Re-throw original error
      }
    } finally {
      clearTimeout(timeoutId);
      console.log(`ProfileService: Exiting updateProfile for user ID: ${userId}.`);
    }
  }
}
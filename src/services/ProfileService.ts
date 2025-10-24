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
    console.log(`ProfileService: ensureProfileExists called for userId: ${userId}, session present: ${!!session}`);
    if (!session) {
      console.warn(`ProfileService: ensureProfileExists for user ID: ${userId} - No session provided. Aborting.`);
      handleError(null, 'No active session to ensure profile exists.');
      throw new Error('No active session to ensure profile exists.'); // Throw error
    }
    console.log(`ProfileService: ensureProfileExists for user ID: ${userId}. Session user ID: ${session.user.id}.`);

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

      console.log(`ProfileService: ensureProfileExists - Supabase response for select:`, { data, selectError });

      if (selectError) {
        if (selectError.code === 'PGRST116') { // No rows found
          console.log(`ProfileService: No existing profile found for ${userId}. Attempting to insert a default profile.`);
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              first_name: null,
              last_name: null,
              avatar_url: null,
              subscription_status: 'free',
              role: session.user.email === 'wpwscannerfeed@gmail.com' ? 'admin' : 'user',
              username: null,
              updated_at: new Date().toISOString(),
            })
            .abortSignal(controller.signal);
          if (insertError) {
            if (insertError.code === '23505') {
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

  static async fetchProfile(userId: string, session: Session | null): Promise<Profile | null> {
    console.log(`ProfileService: fetchProfile called for userId: ${userId}, session present: ${!!session}`);
    if (!session) {
      console.warn(`ProfileService: fetchProfile for user ID: ${userId} - No session provided. Returning null.`);
      throw new Error('No active session to fetch profile.'); // Throw error
    }
    console.log(`ProfileService: fetchProfile for user ID: ${userId}. Session user ID: ${session.user.id}.`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`ProfileService: fetchProfile for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
    }, SUPABASE_API_TIMEOUT);

    try {
      console.log(`ProfileService: fetchProfile - Ensuring profile exists for ${userId}.`);
      const profileEnsured = await ProfileService.ensureProfileExists(userId, session);
      if (!profileEnsured) {
        console.warn(`ProfileService: fetchProfile - Failed to ensure profile for ${userId}. Returning null.`);
        throw new Error('Failed to ensure profile existence before fetching.'); // Throw error
      }
      console.log(`ProfileService: fetchProfile - Profile existence ensured for ${userId}.`);

      console.log(`ProfileService: fetchProfile - Attempting Supabase select for profile ${userId}.`);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, subscription_status, role, username, updated_at')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();

      console.log('ProfileService: fetchProfile - Supabase query result:', { data, error });

      if (error) {
        logSupabaseError('fetchProfile', error);
        throw error;
      }
      if (!data) {
        console.log(`ProfileService: fetchProfile - No profile data returned for ${userId} after successful ensure. This is unexpected.`);
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
        logSupabaseError('fetchProfile', err);
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
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .abortSignal(controller.signal)
        .select()
        .single();

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
    }
  }
}
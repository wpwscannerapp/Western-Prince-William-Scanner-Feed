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

    try {
      console.log(`ProfileService: ensureProfileExists - Attempting to select profile for ${userId}.`);
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      console.log(`ProfileService: ensureProfileExists - Supabase response for select:`, { existingProfile, selectError }); // New log

      if (selectError && selectError.code !== 'PGRST116') {
        logSupabaseError('ensureProfileExists - select', selectError);
        handleError(selectError, 'Failed to check for existing profile.');
        return false;
      }
      console.log(`ProfileService: ensureProfileExists - existingProfile check result:`, existingProfile);

      if (!existingProfile) {
        console.log(`ProfileService: No existing profile found for ${userId}. Attempting to insert.`);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId, subscription_status: 'free', role: 'user' })
          .abortSignal(controller.signal);

        if (insertError) {
          logSupabaseError('ensureProfileExists - insert', insertError);
          handleError(insertError, 'Failed to create new user profile.');
          return false;
        }
        console.log(`ProfileService: Profile successfully inserted for ${userId}.`);
      } else {
        console.log(`ProfileService: Profile already exists for ${userId}.`);
      }
      return true;
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, subscription_status, role, username, updated_at') // Simplified select
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      console.log('ProfileService: Supabase query awaited. Result:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`ProfileService: fetchProfile - No profile found for ${userId} (PGRST116).`);
          return null;
        }
        logSupabaseError('fetchProfile', error);
        throw error;
      }
      if (!data) {
        console.log(`ProfileService: fetchProfile - Data is null, returning null.`);
        return null;
      }
      console.log(`ProfileService: fetchProfile - Profile data found:`, data);
      return data as Profile;
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
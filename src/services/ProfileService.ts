import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { Session } from '@supabase/supabase-js'; // Import Session type

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
      handleError(null, 'No active session to ensure profile exists.'); // Added error toast
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means no rows found
        logSupabaseError('ensureProfileExists - select', selectError);
        handleError(selectError, 'Failed to check for existing profile.'); // Added error toast
        return false;
      }

      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId, subscription_status: 'free', role: 'user' })
          .abortSignal(controller.signal);

        if (insertError) {
          logSupabaseError('ensureProfileExists - insert', insertError);
          handleError(insertError, 'Failed to create new user profile.'); // Added error toast
          return false;
        }
      }
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Ensuring profile existence timed out.');
      } else {
        logSupabaseError('ensureProfileExists', err);
        handleError(err, 'An unexpected error occurred while ensuring profile exists.'); // Added error toast
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logSupabaseError('fetchProfile', error);
        throw error;
      }
      if (!data) {
        return null;
      }
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching profile timed out.');
      } else {
        logSupabaseError('fetchProfile', err);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
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
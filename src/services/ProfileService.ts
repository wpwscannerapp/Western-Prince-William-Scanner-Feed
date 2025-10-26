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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`ProfileService: ensureProfileExists for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
    }, SUPABASE_API_TIMEOUT);

    try {
      const { data, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();

      if (selectError) {
        if (selectError.code === 'PGRST116') { // No rows found
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

          if (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation, means profile was created concurrently
              return true;
            }
            logSupabaseError('ensureProfileExists - insert', insertError);
            throw insertError; // Throw error
          }
          return true;
        }
        logSupabaseError('ensureProfileExists - select', selectError);
        throw selectError; // Throw error
      }
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Ensuring profile existence timed out.');
        throw new Error('Ensuring profile existence timed out.'); // Re-throw for upstream
      } else {
        logSupabaseError('ensureProfileExists', err);
        throw err; // Re-throw original error
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async fetchProfile(userId: string): Promise<Profile | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`ProfileService: fetchProfile for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
    }, SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, subscription_status, role, username, updated_at')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();

      if (error) {
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
        throw new Error('Fetching profile timed out.'); // Re-throw for upstream
      } else {
        // Log the specific Supabase error code if available
        const errorMessage = err.code ? `Supabase Error (${err.code}): ${err.message}` : err.message;
        handleError(err, `Failed to fetch profile: ${errorMessage}`);
        throw err; // Re-throw original error
      }
    } finally {
      clearTimeout(timeoutId);
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
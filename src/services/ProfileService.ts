import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { Session } from '@supabase/supabase-js'; // Import Session type
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import timeout constant

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
    console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Starting operation.`);
    if (!session) {
      console.warn(`ProfileService: ensureProfileExists for user ID: ${userId} - No session provided. Aborting.`);
      return false;
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Attempting to fetch existing profile.`);
      console.log(`ProfileService: ensureProfileExists - User ID: ${userId}, Session present: ${!!session}, Access Token present: ${!!session?.access_token}`);
      
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      clearTimeout(timeoutId); // Clear timeout if query completes

      if (selectError) {
        if (selectError.code === 'PGRST116') { // No rows found
          console.log(`ProfileService: No existing profile found for user ID: ${userId}. Proceeding to insert.`);
        } else {
          logSupabaseError('ensureProfileExists - select', selectError);
          console.error(`ProfileService: ensureProfileExists for user ID ${userId} - Select failed:`, selectError);
          return false;
        }
      } else if (existingProfile) {
        console.log(`ProfileService: Profile already exists for user ID: ${userId}. No insert needed.`);
        console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Operation completed successfully in ${Date.now() - startTime}ms.`);
        return true;
      }

      console.log(`ProfileService: Attempting to insert new profile for user ID: ${userId}.`);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, subscription_status: 'free', role: 'user' })
        .abortSignal(controller.signal);

      if (insertError) {
        logSupabaseError('ensureProfileExists - insert', insertError);
        console.error(`ProfileService: ensureProfileExists for user ID ${userId} - Insert failed:`, insertError);
        return false;
      }
      console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Insert completed successfully in ${Date.now() - startTime}ms.`);
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`ProfileService: Query timed out for user ${userId} in ensureProfileExists.`); // Explicit timeout log
        handleError(new Error('Request timed out'), `Profile check for user ${userId} timed out.`);
      } else {
        console.error(`ProfileService: Caught unexpected error during ensureProfileExists for user ID ${userId}:`, err);
        logSupabaseError('ensureProfileExists', err);
      }
      return false;
    } finally {
      clearTimeout(timeoutId); // Ensure timeout is always cleared
    }
  }

  static async fetchProfile(userId: string, session: Session | null): Promise<Profile | null> {
    console.log(`ProfileService: Attempting to fetch profile for user ID: ${userId}`);
    if (!session) {
      console.warn(`ProfileService: fetchProfile for user ID: ${userId} - No session provided. Returning null.`);
      return null;
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      console.log(`ProfileService: fetchProfile for user ID: ${userId} - Executing Supabase query.`);
      console.log(`ProfileService: fetchProfile - User ID: ${userId}, Session present: ${!!session}, Access Token present: ${!!session?.access_token}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      clearTimeout(timeoutId); // Clear timeout if query completes

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`ProfileService: No profile found for user ID: ${userId}. This user might not have a profile entry.`);
          return null;
        }
        logSupabaseError('fetchProfile', error);
        console.error(`ProfileService: Error fetching profile for user ID ${userId}:`, error);
        throw error;
      }
      if (!data) {
        console.warn(`ProfileService: No profile data returned for user ID: ${userId} (maybeSingle returned null).`);
        return null;
      }
      console.log(`ProfileService: Successfully fetched profile for user ID: ${userId} in ${Date.now() - startTime}ms. Role: ${data.role}`);
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`ProfileService: Query timed out for user ${userId} in fetchProfile.`); // Explicit timeout log
        handleError(new Error('Request timed out'), `Profile fetch for user ${userId} timed out.`);
      } else {
        console.error(`ProfileService: Caught error during fetchProfile for user ID ${userId}:`, err);
        logSupabaseError('fetchProfile', err);
      }
      throw err; // Re-throw to be caught by react-query
    } finally {
      clearTimeout(timeoutId); // Ensure timeout is always cleared
    }
  }

  static async updateProfile(
    userId: string,
    updates: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null; username?: string | null }
  ): Promise<Profile | null> {
    console.log(`ProfileService: Attempting to update profile for user ID: ${userId}`);
    const startTime = Date.now();
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

      clearTimeout(timeoutId); // Clear timeout if query completes

      if (error) {
        logSupabaseError('updateProfile', error);
        return null;
      }
      console.log(`ProfileService: Successfully updated profile for user ID: ${userId} in ${Date.now() - startTime}ms.`);
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`ProfileService: Query timed out for user ${userId} in updateProfile.`); // Explicit timeout log
        handleError(new Error('Request timed out'), `Profile update for user ${userId} timed out.`);
      } else {
        console.error(`ProfileService: Caught error during updateProfile for user ID ${userId}:`, err);
        logSupabaseError('updateProfile', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId); // Ensure timeout is always cleared
    }
  }
}
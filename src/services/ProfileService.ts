import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  subscription_status: string;
  role: string; // Keeping 'role' for consistency with existing schema
  username: string | null;
  updated_at: string;
}

export class ProfileService { // Changed to a class
  static async ensureProfileExists(userId: string): Promise<boolean> {
    console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Starting check/upsert process.`);
    try {
      console.log(`ProfileService: ensureProfileExists for user ID: ${userId} - Checking for existing profile.`);
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
        .timeout(SUPABASE_API_TIMEOUT); // Using global timeout

      if (selectError) {
        if (selectError.code === 'PGRST116') { // No rows found, which is fine
          console.log(`ProfileService: No profile found for user ID: ${userId}.`);
        } else {
          handleError(selectError, `Failed to check profile existence for user ID: ${userId}.`);
          throw selectError; // Re-throw to be caught by calling functions
        }
      }

      if (existingProfile) {
        console.log(`ProfileService: Profile already exists for user ID: ${userId}. Skipping upsert.`);
        return true;
      }

      // If no profile exists, proceed with upsert to create it
      console.log(`ProfileService: No profile found, executing upsert to create for user ID: ${userId}.`);
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, subscription_status: 'free', role: 'user' }, // Default values, using 'role'
          { onConflict: 'id' }
        )
        .timeout(SUPABASE_API_TIMEOUT); // Using global timeout

      if (upsertError) {
        handleError(upsertError, `Failed to create profile for user ID: ${userId}.`);
        throw upsertError;
      }
      console.log(`ProfileService: Profile created successfully for user ID: ${userId}.`);
      return true;
    } catch (err: any) {
      handleError(err, `An unexpected error occurred in ensureProfileExists for user ID: ${userId}.`);
      throw err; // Re-throw to propagate
    }
  }

  static async fetchProfile(userId: string): Promise<Profile | null> { // Renamed from getProfile
    console.log(`ProfileService: Attempting to fetch profile for user ID: ${userId}`);
    try {
      console.log(`ProfileService: Executing Supabase query for user ID: ${userId}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*') // Selecting all columns as per original fetchProfile
        .eq('id', userId)
        .maybeSingle()
        .timeout(SUPABASE_API_TIMEOUT); // Using global timeout

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          console.warn(`ProfileService: No profile found for user ID: ${userId}.`);
          return null;
        }
        handleError(error, `Failed to fetch profile for user ID: ${userId}.`);
        throw error;
      }
      if (!data) {
        console.warn(`ProfileService: No profile data returned for user ID: ${userId} (maybeSingle returned null).`);
        return null;
      }
      console.log(`ProfileService: Successfully fetched profile for user ID: ${userId}. Role: ${data.role}`);
      return data as Profile;
    } catch (err: any) {
      handleError(err, `An unexpected error occurred in fetchProfile for user ID: ${userId}.`);
      throw err;
    }
  }

  static async updateProfile(
    userId: string,
    updates: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null; username?: string | null }
  ): Promise<Profile | null> {
    console.log(`ProfileService: Attempting to update profile for user ID: ${userId}`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
        .timeout(SUPABASE_API_TIMEOUT); // Using global timeout

      if (error) {
        handleError(error, `Failed to update profile for user ID: ${userId}.`);
        throw error;
      }
      console.log(`ProfileService: Successfully updated profile for user ID: ${userId}.`);
      return data as Profile;
    } catch (err: any) {
      handleError(err, `An unexpected error occurred in updateProfile for user ID: ${userId}.`);
      throw err;
    }
  }
}
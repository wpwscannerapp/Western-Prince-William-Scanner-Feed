"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

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
  if (import.meta.env.DEV) {
    console.error(`Supabase Error in ${functionName}:`, error);
  }
};

export class ProfileService {
  static async ensureProfileExists(userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      if (import.meta.env.DEV) {
        console.error(`ProfileService: ensureProfileExists for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
      }
    }, SUPABASE_API_TIMEOUT);

    try {
      const { error: selectError } = await supabase
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
              AnalyticsService.trackEvent({ name: 'profile_ensure_exists_concurrent_insert', properties: { userId } });
              return true;
            }
            logSupabaseError('ensureProfileExists - insert', insertError);
            AnalyticsService.trackEvent({ name: 'profile_ensure_exists_insert_failed', properties: { userId, error: insertError.message } });
            throw insertError;
          }
          AnalyticsService.trackEvent({ name: 'profile_created_on_ensure', properties: { userId } });
          return true;
        }
        logSupabaseError('ensureProfileExists - select', selectError);
        AnalyticsService.trackEvent({ name: 'profile_ensure_exists_select_failed', properties: { userId, error: selectError.message } });
        throw selectError;
      }
      AnalyticsService.trackEvent({ name: 'profile_exists_checked', properties: { userId } });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Ensuring profile existence timed out.');
        AnalyticsService.trackEvent({ name: 'profile_ensure_exists_timeout', properties: { userId } });
        throw new Error('Ensuring profile existence timed out.');
      } else {
        logSupabaseError('ensureProfileExists', err);
        AnalyticsService.trackEvent({ name: 'profile_ensure_exists_unexpected_error', properties: { userId, error: err.message } });
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async fetchProfile(userId: string): Promise<Profile | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      if (import.meta.env.DEV) {
        console.error(`ProfileService: fetchProfile for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
      }
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
        AnalyticsService.trackEvent({ name: 'fetch_profile_failed', properties: { userId, error: error.message } });
        throw error;
      }
      if (!data) {
        AnalyticsService.trackEvent({ name: 'fetch_profile_not_found', properties: { userId } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'profile_fetched', properties: { userId, role: data.role, subscription_status: data.subscription_status } });
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching profile timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_profile_timeout', properties: { userId } });
        throw new Error('Fetching profile timed out.');
      } else {
        const errorMessage = err.code ? `Supabase Error (${err.code}): ${err.message}` : err.message;
        handleError(err, `Failed to fetch profile: ${errorMessage}`);
        AnalyticsService.trackEvent({ name: 'fetch_profile_unexpected_error', properties: { userId, error: err.message } });
        throw err;
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
      if (import.meta.env.DEV) {
        console.error(`ProfileService: updateProfile for ${userId} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
      }
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
        AnalyticsService.trackEvent({ name: 'update_profile_failed', properties: { userId, updates: Object.keys(updates), error: error.message } });
        throw error;
      }
      AnalyticsService.trackEvent({ name: 'profile_updated', properties: { userId, updates: Object.keys(updates) } });
      return data as Profile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating profile timed out.');
        AnalyticsService.trackEvent({ name: 'update_profile_timeout', properties: { userId } });
        throw new Error('Updating profile timed out.');
      } else {
        logSupabaseError('updateProfile', err);
        AnalyticsService.trackEvent({ name: 'update_profile_unexpected_error', properties: { userId, error: err.message } });
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
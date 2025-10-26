"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { ProfileService } from '@/services/ProfileService';
import { Session } from '@supabase/supabase-js';

/**
 * @file This file contains functions for testing Supabase session and profile queries.
 * It is intended for development and debugging purposes only and should not be used in production.
 */

export async function testGetSession() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error('Supabase getSession timed out after 15s');
      handleError(timeoutError, 'Supabase session retrieval timed out.');
      reject(timeoutError);
    }, 15000); // 15-second timeout
  });

  try {
    const getSessionPromise = supabase.auth.getSession();
    const result = await Promise.race([getSessionPromise, timeoutPromise]);

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    const { data, error } = result as { data: { session: any | null }; error: any | null };

    if (error) {
      handleError(error, 'Error retrieving Supabase session.');
      throw error;
    }
    return data;
  } catch (err: any) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (err.message !== 'Supabase getSession timed out after 15s') {
      handleError(err, 'Supabase session retrieval failed unexpectedly.');
    }
    throw err;
  }
}

export async function testProfileQuery(session: Session | null) {
  if (!session || !session.user) {
    handleError(null, 'No active session or user to test profile query.');
    return;
  }

  try {
    const profile = await ProfileService.fetchProfile(session.user.id);
    if (profile) {
      handleError(null, `Profile fetched successfully for ${profile.username || profile.first_name || session.user.email}. Role: ${profile.role}`, { duration: 5000 });
    } else {
      handleError(null, 'Profile not found or could not be fetched for the current user.');
    }
  } catch (err: any) {
    handleError(err, 'Failed to fetch profile during test query.');
  }
}
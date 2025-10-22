import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { ProfileService } from '@/services/ProfileService'; // Import ProfileService
import { Session } from '@supabase/supabase-js'; // Import Session type

export async function testGetSession() {
  console.time('getSession');
  console.log('Starting supabase.auth.getSession()');

  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined; // Initialize timeoutId

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error('Supabase getSession timed out after 15s');
      console.error(timeoutError.message);
      handleError(timeoutError, 'Supabase session retrieval timed out.');
      reject(timeoutError);
    }, 15000); // 15-second timeout
  });

  try {
    const getSessionPromise = supabase.auth.getSession();
    const result = await Promise.race([getSessionPromise, timeoutPromise]);

    if (timeoutId !== undefined) { // Only clear if it was assigned
      clearTimeout(timeoutId); // Clear the timeout if getSessionPromise wins
    }
    console.timeEnd('getSession');

    // The result will be from getSessionPromise if it wins
    const { data, error } = result as { data: { session: any | null }; error: any | null };

    if (error) {
      console.error('getSession error:', error.message, error);
      handleError(error, 'Error retrieving Supabase session.');
      throw error;
    }
    console.log('getSession success:', data);
    return data;
  } catch (err: any) {
    if (timeoutId !== undefined) { // Only clear if it was assigned
      clearTimeout(timeoutId); // Ensure timeout is cleared even if getSessionPromise rejects before timeout
    }
    console.error('getSession failed:', err);
    // If the error is from our timeoutPromise, handleError was already called.
    // Otherwise, it's an error from supabase.auth.getSession itself.
    if (err.message !== 'Supabase getSession timed out after 15s') {
      handleError(err, 'Supabase session retrieval failed unexpectedly.');
    }
    throw err;
  }
}

export async function testProfileQuery(session: Session | null) {
  console.log('Starting testProfileQuery...');
  if (!session || !session.user) {
    console.warn('testProfileQuery: No active session or user found. Cannot test profile query.');
    handleError(null, 'No active session or user to test profile query.');
    return;
  }

  try {
    console.log(`testProfileQuery: Attempting to fetch profile for user ID: ${session.user.id}`);
    const profile = await ProfileService.fetchProfile(session.user.id, session);
    if (profile) {
      console.log('testProfileQuery: Profile fetched successfully:', profile);
      handleError(null, `Profile fetched successfully for ${profile.username || profile.first_name || session.user.email}. Role: ${profile.role}`, { duration: 5000 });
    } else {
      console.warn('testProfileQuery: Profile not found or could not be fetched.');
      handleError(null, 'Profile not found or could not be fetched for the current user.');
    }
  } catch (err: any) {
    console.error('testProfileQuery: Error fetching profile:', err);
    handleError(err, 'Failed to fetch profile during test query.');
  }
}
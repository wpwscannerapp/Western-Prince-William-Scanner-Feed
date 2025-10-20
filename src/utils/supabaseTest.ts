import { supabase } from '@/integrations/supabase/client'; // Adjusted path to your Supabase client file
import { handleError } from '@/utils/errorHandler';

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

export async function resetSession() {
  try {
    console.log('Signing out...');
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
    console.log('Session cleared, attempting re-authentication');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'YOUR_VALID_TEST_EMAIL', // IMPORTANT: Replace with a valid test email
      password: 'YOUR_VALID_TEST_PASSWORD' // IMPORTANT: Replace with the correct password
    });
    if (error) {
      console.error('Re-authentication failed:', error.message, error);
      throw error;
    }
    console.log('Re-authentication success:', data);
    console.log('Post-auth localStorage supabase.auth.token:', localStorage.getItem('supabase.auth.token'));
  } catch (err) {
    console.error('resetSession failed:', err);
  }
}
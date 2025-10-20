import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import type { Session } from '@supabase/supabase-js';

export async function testProfileQuery(session: Session | null) {
  console.log('Test query: Starting');
  if (!session) {
    console.error('Test query: No session');
    handleError(null, 'Test query failed: No active session.');
    return;
  }
  try {
    console.log('Test query: Fetching profiles for user ID:', session.user.id);
    const { data, error } = await supabase.from('profiles').select('id, role').limit(1).eq('id', session.user.id);
    if (error) throw error;
    console.log('Test query success:', data);
    handleError(null, `Test query successful! Profile ID: ${data[0]?.id}, Role: ${data[0]?.role}`, { duration: 5000, style: { backgroundColor: 'green', color: 'white' } });
  } catch (err: any) {
    console.error('Test query failed:', err);
    handleError(err, 'Test query failed unexpectedly.');
  }
}
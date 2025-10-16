import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    console.log('useIsAdmin: useEffect triggered. authLoading:', authLoading, 'user:', user ? 'present' : 'null'); // Added log
    async function checkAdminRole() {
      if (authLoading) {
        console.log('useIsAdmin: authLoading is true, returning early.'); // Added log
        return; // Wait for auth to finish loading
      }

      if (!user) {
        console.log('useIsAdmin: No user, setting isAdmin to false and profileLoading to false.'); // Added log
        setIsAdmin(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      console.log('useIsAdmin: Fetching user profile role for user ID:', user.id); // Added log
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('useIsAdmin: Error fetching user role:', error); // Modified log
        setIsAdmin(false);
      } else if (profile) {
        console.log('useIsAdmin: Profile fetched. Role:', profile.role); // Added log
        setIsAdmin(profile.role === 'admin');
      } else {
        console.log('useIsAdmin: No profile found or role not admin, setting isAdmin to false.'); // Added log
        setIsAdmin(false); // No profile found or role not 'admin'
      }
      console.log('useIsAdmin: Setting profileLoading to false.'); // Added log
      setProfileLoading(false);
    }

    checkAdminRole();
  }, [user, authLoading]);

  return { isAdmin, loading: profileLoading };
}
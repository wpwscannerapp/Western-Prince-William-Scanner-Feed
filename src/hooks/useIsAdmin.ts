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
    async function checkAdminRole() {
      if (authLoading) return; // Wait for auth to finish loading

      if (!user) {
        setIsAdmin(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setIsAdmin(false);
      } else if (profile) {
        setIsAdmin(profile.role === 'admin');
      } else {
        setIsAdmin(false); // No profile found or role not 'admin'
      }
      setProfileLoading(false);
    }

    checkAdminRole();
  }, [user, authLoading]);

  return { isAdmin, loading: profileLoading };
}
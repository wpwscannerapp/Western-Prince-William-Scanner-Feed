import { useAuth } from '@/hooks/useAuth';
import { ADMIN_EMAIL } from '@/lib/constants';

export function useIsAdmin(): boolean {
  const { user, loading } = useAuth();
  if (loading || !user) {
    return false;
  }
  return user.email === ADMIN_EMAIL;
}
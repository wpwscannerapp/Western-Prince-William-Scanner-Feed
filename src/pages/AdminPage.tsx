import { useState, useEffect } from 'react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AdminDashboardTabs from '@/components/AdminDashboardTabs'; // Import the new tabs component

const AdminPage = () => {
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [postTableKey, setPostTableKey] = useState(0); // Key to force re-render of post table

  useEffect(() => {
    if (!authLoading && !isAdminLoading && !isAdmin) {
      toast.error('Access Denied: You must be an administrator to view this page.');
      navigate('/home');
    }
  }, [isAdmin, isAdminLoading, authLoading, navigate]);

  const handlePostTableRefresh = () => {
    setPostTableKey(prev => prev + 1);
  };

  if (authLoading || isAdminLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8">
      <h1 className="tw-text-3xl tw-font-bold tw-mb-6 tw-text-foreground">Admin Dashboard</h1>

      <AdminDashboardTabs key={postTableKey} onPostTableRefresh={handlePostTableRefresh} />

      <MadeWithDyad />
    </div>
  );
};

export default AdminPage;
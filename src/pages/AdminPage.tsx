import { useState } from 'react'; // Removed useEffect
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AdminDashboardTabs from '@/components/AdminDashboardTabs';
import { Button } from '@/components/ui/button';
// import { handleError } from '@/utils/errorHandler'; // Removed unused import

const AdminPage = () => {
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Combine Redirect Logic: Move the redirect logic into the render phase
  if (!authLoading && !isAdminLoading && !isAdmin) {
    toast.error('Access Denied: You must be an administrator to view this page.');
    navigate('/home');
    return null; // Prevent rendering the admin page content
  }

  // Add Error Handling: AdminDashboardTabs will handle its own internal errors.
  // This error state is for any potential issues directly within AdminPage or its initial setup.
  // For now, it's primarily used for the retry mechanism.

  const handleRetry = () => {
    setError(null);
    // Re-trigger data fetching in AdminDashboardTabs if needed, or simply clear error
  };

  if (authLoading || isAdminLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading admin panel...</p>
      </div>
    );
  }

  // If not admin, we've already redirected, so this return should ideally not be reached
  if (!isAdmin) {
    return null;
  }

  if (error) {
    return (
      <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8">
        <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12">
          <p className="tw-text-destructive tw-mb-4">Error: {error}</p>
          <Button onClick={handleRetry}>Retry</Button>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8">
      <h1 className="tw-text-3xl tw-font-bold tw-mb-6 tw-text-foreground">Admin Dashboard</h1>
      {/* Optimize Re-rendering: Removed key={postTableKey}. AdminDashboardTabs will manage its own internal refresh. */}
      <AdminDashboardTabs />
      <MadeWithDyad />
    </div>
  );
};

export default AdminPage;
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AdminDashboardTabs from '@/components/AdminDashboardTabs';
import { Button } from '@/components/ui/button';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDebugInfo from '@/components/AdminDebugInfo'; // Import the new debug component

const AdminPage = () => {
  const { loading: authLoading } = useAuth(); // Removed 'user' as it's not directly used here
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');

  // If not loading and not admin, show access denied message and debug info
  if (!authLoading && !isAdminLoading && !isAdmin) {
    // Only show toast once, not on every render
    if (!error) { // Prevent repeated toasts
      toast.error('Access Denied: You must be an administrator to view this page.');
      setError('Access Denied: You must be an administrator to view this page.'); // Set local error state
    }
    // Do not navigate away immediately, allow debug info to be seen
  }

  // Removed handleRetry as it was not being used.

  if (authLoading || isAdminLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading admin panel...</p>
      </div>
    );
  }

  // If not admin, display debug info and an error message
  if (!isAdmin) {
    return (
      <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8">
        <AdminDebugInfo /> {/* Display debug info */}
        <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12 tw-bg-card tw-rounded-lg tw-shadow-md">
          <AlertCircle className="tw-h-12 tw-w-12 tw-text-destructive tw-mb-4" aria-hidden="true" />
          <p className="tw-text-destructive tw-text-lg tw-mb-4">{error || 'You do not have permission to view this page.'}</p>
          <Button onClick={() => navigate('/home')} size="lg" className="tw-bg-primary hover:tw-bg-primary/90">
            Go to Home Page
          </Button>
        </div>
        <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
      </div>
    );
  }

  // If admin, proceed with the normal admin dashboard
  return (
    <div className="tw-flex tw-flex-col md:tw-flex-row tw-min-h-screen tw-bg-background"> {/* Changed to flex-col on mobile, flex-row on md */}
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="tw-flex-1 tw-p-4 md:tw-p-8">
        <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground">Admin Dashboard</h1>
        <div className="tw-grid tw-gap-4">
          <AdminDashboardTabs activeTab={activeTab} />
        </div>
        <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
      </main>
    </div>
  );
};

export default AdminPage;
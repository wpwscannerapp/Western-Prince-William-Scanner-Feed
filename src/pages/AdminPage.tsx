import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AdminDashboardTabs from '@/components/AdminDashboardTabs';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDebugInfo from '@/components/AdminDebugInfo'; // Import the new debug component
// import { useQueryClient } from '@tanstack/react-query'; // Remove this import

const AdminPage = () => {
  const { user, loading: authLoading, authReady } = useAuth(); // Added authReady
  const { isAdmin, loading: isAdminLoading } = useIsAdmin(); // isAdminLoading here is the overallLoading from useIsAdmin
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('incidents'); // Default to 'incidents' tab
  // const queryClient = useQueryClient(); // Remove this initialization

  useEffect(() => {
    console.log('AdminPage useEffect check:', { authReady, isAdminLoading, isAdmin, user: user?.id });

    // Only redirect if authentication is ready, admin status check is complete, AND user is not an admin.
    if (authReady && !isAdminLoading && !isAdmin) {
      toast.error('Access Denied: You must be an administrator to view this page.');
      navigate('/home', { replace: true }); // Redirect to home page
    }
  }, [authReady, isAdminLoading, isAdmin, navigate]); // Updated dependencies

  if (authLoading || isAdminLoading) { // This is the overall loading state
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading admin panel...</p>
      </div>
    );
  }

  // If we reach here, it means isAdmin is true (or we're still loading, which is handled above)
  // Render the admin dashboard content only if the user is an admin.
  if (isAdmin) {
    return (
      <div className="tw-flex tw-flex-col md:tw-flex-row tw-min-h-screen tw-bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="tw-flex-1 tw-p-4 md:tw-p-8">
          <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground">Admin Dashboard</h1>
          {/* AdminDebugInfo is now only shown to actual admins */}
          <AdminDebugInfo /> 
          <div className="tw-grid tw-gap-4">
            <AdminDashboardTabs activeTab={activeTab} />
          </div>
          <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
        </main>
      </div>
    );
  }

  // If not admin and not loading, the useEffect above will handle the redirect.
  // This return should ideally not be reached if the redirect works as expected.
  return null;
};

export default AdminPage;
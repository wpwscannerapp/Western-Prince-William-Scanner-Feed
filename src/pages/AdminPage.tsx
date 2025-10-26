import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AdminDashboardTabs from '@/components/AdminDashboardTabs';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDebugInfo from '@/components/AdminDebugInfo'; // Import the new debug component
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('incidents'); // Default to 'incidents' tab
  const queryClient = useQueryClient(); // Initialize queryClient

  useEffect(() => {
    // Invalidate the userRole query when AdminPage mounts to ensure fresh admin status check
    if (user) {
      console.log('AdminPage: Invalidating userRole query for user:', user.id);
      queryClient.invalidateQueries({ queryKey: ['userRole', user.id] });
    }

    // Only redirect if not loading and user is definitively not an admin
    if (!authLoading && !isAdminLoading && !isAdmin) {
      toast.error('Access Denied: You must be an administrator to view this page.');
      navigate('/home', { replace: true }); // Redirect to home page
    }
  }, [authLoading, isAdminLoading, isAdmin, navigate, user, queryClient]); // Added user and queryClient to dependencies

  if (authLoading || isAdminLoading) {
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
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
// Removed: import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react'; // Added AlertCircle for access denied message
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AdminDashboardTabs from '@/components/AdminDashboardTabs';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDebugInfo from '@/components/AdminDebugInfo'; // Import the new debug component
import { Button } from '@/components/ui/button'; // Import Button for the access denied message
import { Card, CardContent } from '@/components/ui/card'; // Import Card components

const AdminPage = () => {
  const { loading: authLoading } = useAuth(); // Removed 'user' from destructuring
  const { isAdmin, loading: isAdminLoading } = useIsAdmin(); // isAdminLoading here is the overallLoading from useIsAdmin
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('incidents'); // Default to 'incidents' tab

  if (authLoading || isAdminLoading) { // This is the overall loading state
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading admin panel...</p>
      </div>
    );
  }

  // If loading is complete and the user is an admin, render the dashboard.
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

  // If loading is complete and the user is NOT an admin, show access denied.
  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
      <Card className="tw-w-full tw-max-w-md tw-text-center tw-bg-card tw-border-destructive tw-border-2 tw-shadow-lg">
        <CardContent className="tw-py-8">
          <AlertCircle className="tw-h-12 tw-w-12 tw-text-destructive tw-mx-auto tw-mb-4" />
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Access Denied</h1>
          <p className="tw-text-muted-foreground tw-mb-6">
            You do not have administrator privileges to view this page.
          </p>
          <Button onClick={() => navigate('/home')} className="tw-w-full tw-button">
            Go to Home Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
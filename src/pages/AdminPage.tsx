import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AdminDashboardTabs from '@/components/AdminDashboardTabs';
import { Button } from '@/components/ui/button';
// import { handleError } from '@/utils/errorHandler'; // Removed unused import
import AdminSidebar from '@/components/AdminSidebar';

const AdminPage = () => {
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');

  if (!authLoading && !isAdminLoading && !isAdmin) {
    toast.error('Access Denied: You must be an administrator to view this page.');
    navigate('/home');
    return null;
  }

  const handleRetry = () => {
    setError(null);
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

  if (error) {
    return (
      <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8">
        <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12 tw-bg-card tw-rounded-lg tw-shadow-md">
          <AlertCircle className="tw-h-12 tw-w-12 tw-text-destructive tw-mb-4" aria-hidden="true" />
          <p className="tw-text-destructive tw-text-lg tw-mb-4">Error: {error}</p>
          <Button onClick={handleRetry} size="lg" className="tw-bg-primary hover:tw-bg-primary/90">
            Retry
          </Button>
        </div>
        <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
      </div>
    );
  }

  return (
    <div className="tw-flex tw-min-h-screen tw-bg-background">
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
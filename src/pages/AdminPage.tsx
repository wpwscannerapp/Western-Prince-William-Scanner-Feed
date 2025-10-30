"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AdminDashboardTabs from '@/components/AdminDashboardTabs';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService
import { useEffect } from 'react';

const AdminPage = () => {
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('incidents');

  useEffect(() => {
    if (!authLoading && !isAdminLoading && !isAdmin) {
      AnalyticsService.trackEvent({ name: 'admin_page_access_denied', properties: { userId: 'unknown' } });
    } else if (!authLoading && !isAdminLoading && isAdmin) {
      AnalyticsService.trackEvent({ name: 'admin_page_accessed', properties: { userId: 'known_admin' } });
    }
  }, [authLoading, isAdminLoading, isAdmin]);

  if (authLoading || isAdminLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading admin panel" />
        <p className="tw-ml-2">Loading admin panel...</p>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="tw-flex tw-flex-col md:tw-flex-row tw-min-h-screen tw-bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="tw-flex-1 tw-p-4 md:tw-p-8">
          <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
            Back to Dashboard
          </Button>
          <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground">Admin Dashboard</h1>
          <div className="tw-grid tw-gap-4">
            <AdminDashboardTabs activeTab={activeTab} />
          </div>
          <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
        </main>
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
      <Card className="tw-w-full tw-max-w-md tw-text-center tw-bg-card tw-border-destructive tw-border-2 tw-shadow-lg">
        <CardContent className="tw-py-8">
          <AlertCircle className="tw-h-12 tw-w-12 tw-text-destructive tw-mx-auto tw-mb-4" aria-hidden="true" />
          <h1 className="tw-2xl tw-font-bold tw-text-destructive tw-mb-4">Access Denied</h1>
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
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

const AdminDebugInfo: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminCheckLoading } = useIsAdmin();

  // Track when this debug info is viewed
  React.useEffect(() => {
    if (!authLoading && !isAdminCheckLoading) {
      AnalyticsService.trackEvent({ name: 'admin_debug_info_viewed', properties: { userId: user?.id, isAdmin } });
    }
  }, [authLoading, isAdminCheckLoading, user, isAdmin]);

  if (authLoading || isAdminCheckLoading) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg tw-mb-6">
        <CardHeader>
          <CardTitle className="tw-text-lg tw-font-bold tw-text-foreground">Admin Status (Debugging)</CardTitle>
          <CardDescription className="tw-text-muted-foreground">Checking admin role...</CardDescription>
        </CardHeader>
        <CardContent className="tw-flex tw-items-center tw-gap-2">
          <Loader2 className="tw-h-5 tw-w-5 tw-animate-spin tw-text-primary" aria-label="Loading admin status" />
          <p className="tw-text-sm tw-text-muted-foreground">Loading user and admin status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg tw-mb-6">
      <CardHeader>
        <CardTitle className="tw-text-lg tw-font-bold tw-text-foreground tw-flex tw-items-center tw-gap-2">
          <Info className="tw-h-5 tw-w-5 tw-text-blue-500" aria-hidden="true" /> Admin Status (Debugging)
        </CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          This information helps diagnose access issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="tw-space-y-2">
        <div className="tw-flex tw-items-center tw-gap-2">
          <span className="tw-font-medium">Logged In:</span>
          {user ? (
            <span className="tw-flex tw-items-center tw-gap-1 tw-text-green-500">
              <CheckCircle2 className="tw-h-4 tw-w-4" aria-hidden="true" /> Yes ({user.email})
            </span>
          ) : (
            <span className="tw-flex tw-items-center tw-gap-1 tw-text-destructive">
              <XCircle className="tw-h-4 tw-w-4" aria-hidden="true" /> No
            </span>
          )}
        </div>
        <div className="tw-flex tw-items-center tw-gap-2">
          <span className="tw-font-medium">Is Admin:</span>
          {isAdmin ? (
            <span className="tw-flex tw-items-center tw-gap-1 tw-text-green-500">
              <CheckCircle2 className="tw-h-4 tw-w-4" aria-hidden="true" /> Yes
            </span>
          ) : (
            <span className="tw-flex tw-items-center tw-gap-1 tw-text-destructive">
              <XCircle className="tw-h-4 tw-w-4" aria-hidden="true" /> No
            </span>
          )}
        </div>
        {user && !isAdmin && (
          <p className="tw-text-sm tw-text-destructive">
            You are logged in but your profile role is not 'admin'.
          </p>
        )}
        {!user && (
          <p className="tw-text-sm tw-text-muted-foreground">
            Please log in with an admin account to access this page.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminDebugInfo;
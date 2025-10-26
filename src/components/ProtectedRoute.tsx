"use client";

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-animate-spin tw-h-8 tw-w-8 tw-text-primary" aria-label="Loading authentication" />
        <p className="tw-ml-2">Loading authentication...</p>
      </div>
    );
  }

  if (error) {
    AnalyticsService.trackEvent({ name: 'protected_route_error', properties: { error: error.message } });
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <p className="tw-text-destructive">Error: {error.message}</p>
      </div>
    );
  }

  if (!user) {
    AnalyticsService.trackEvent({ name: 'protected_route_unauthenticated_redirect' });
    return <Navigate to="/auth" replace />;
  }

  return <>{children || <Outlet />}</>;
};

export default ProtectedRoute;
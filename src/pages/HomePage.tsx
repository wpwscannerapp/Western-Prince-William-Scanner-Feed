"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Tile from '@/components/Tile';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Loader2, AlertCircle, Map, List } from 'lucide-react';
// import IncidentMap from '@/components/IncidentMap'; // Removed direct import
import { useQuery } from '@tanstack/react-query';
import { NotificationService, Alert } from '@/services/NotificationService';
import { handleError } from '@/utils/errorHandler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

// Lazy load IncidentMap
const LazyIncidentMap = React.lazy(() => import('@/components/IncidentMap'));

const HomePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading, error: isAdminError } = useIsAdmin();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');

  const { data: alerts, isLoading: isLoadingAlerts, isError: isAlertsError, error: alertsError } = useQuery<Alert[], Error>({
    queryKey: ['alerts'],
    queryFn: () => NotificationService.fetchAlerts(),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (isAlertsError) {
      handleError(alertsError, 'Failed to load real-time alerts for the map.');
    }
  }, [isAlertsError, alertsError]);

  if (isAdminError) {
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <AlertCircle className="tw-h-12 tw-w-12 tw-text-destructive tw-mb-4" aria-hidden="true" />
        <h1 className="tw-2xl tw-font-bold tw-text-destructive tw-mb-4">Error Loading Permissions</h1>
        <p className="tw-text-muted-foreground">{isAdminError}</p>
        <button
          className="tw-mt-4 tw-px-4 tw-py-2 tw-bg-primary tw-text-primary-foreground tw-rounded-md hover:tw-bg-primary/90 tw-transition-colors"
          onClick={() => {
            localStorage.removeItem('supabase.auth.token');
            window.location.reload();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (isAdminLoading || authLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading user permissions" />
        <p className="tw-ml-2">Loading user permissions...</p>
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-6xl">
      <div className="tw-mb-8">
        <div className="tw-flex tw-justify-between tw-items-center tw-mb-4">
          <h2 className="tw-text-2xl tw-font-bold tw-text-foreground">Real-time Alerts</h2>
          <div className="tw-flex tw-gap-2">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              aria-label="View alerts as list"
            >
              <List className="tw-h-4 tw-w-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setViewMode('map')}
              aria-label="View alerts on map"
            >
              <Map className="tw-h-4 tw-w-4" />
            </Button>
          </div>
        </div>

        {isLoadingAlerts ? (
          <Card className="tw-bg-card tw-border-border tw-shadow-md">
            <CardContent className="tw-flex tw-items-center tw-justify-center tw-py-8">
              <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" aria-label="Loading alerts" />
              <span className="tw-ml-2 tw-text-muted-foreground">Loading alerts...</span>
            </CardContent>
          </Card>
        ) : alerts && alerts.length > 0 ? (
          viewMode === 'map' ? (
            <Suspense fallback={<div className="tw-h-[500px] tw-w-full tw-rounded-md tw-shadow-md tw-flex tw-items-center tw-justify-center tw-bg-card"><Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading map" /></div>}>
              <LazyIncidentMap alerts={alerts} />
            </Suspense>
          ) : (
            <div className="tw-space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className="tw-bg-card tw-border-border tw-shadow-sm">
                  <CardHeader className="tw-pb-2">
                    <CardTitle className="tw-text-lg tw-font-semibold">{alert.title}</CardTitle>
                    <CardDescription className="tw-text-sm tw-text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()} - {alert.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="tw-text-sm tw-text-foreground">{alert.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card className="tw-bg-card tw-border-border tw-shadow-md">
            <CardContent className="tw-py-8 tw-text-center tw-text-muted-foreground">
              No real-time alerts available.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
        {/* Incidents Feed Tile */}
        <Tile
          title="Incidents Feed"
          description="Real-time scanner updates."
          to="/home/incidents"
          icon="/Logo.png"
        />

        {/* Incident Archive Tile */}
        <Tile
          title="Incident Archive"
          description="Search past incidents and trends."
          to="/home/archive"
          icon="/Logo.png"
        />

        {/* Contact Us Tile */}
        <Tile
          title="Contact Us"
          description="Get in touch with us."
          to="/home/contact-us"
          icon="/Logo.png"
        />

        {/* Feedback & Suggestions Tile */}
        <Tile
          title="Feedback & Suggestions"
          description="Share your thoughts and ideas."
          to="/home/feedback"
          icon="/Logo.png"
        />

        {/* Conditional Tiles based on authentication */}
        {user ? (
          <>
            {/* Profile Tile */}
            <Tile
              title="Profile"
              description="Manage your personal settings."
              to="/profile"
              icon="/Logo.png"
            />
            {/* Admin Dashboard Tile (Conditional) */}
            {isAdmin && (
              <Tile
                title="Admin Dashboard"
                description="Manage incidents, settings, and users."
                to="/admin"
                icon="/Logo.png"
              />
            )}
          </>
        ) : (
          <>
            {/* Subscribe Tile */}
            <Tile
              title="Subscribe"
              description="Unlock premium features."
              to="/subscribe"
              icon="/Logo.png"
            />
            {/* Login / Sign Up Tile */}
            <Tile
              title="Login / Sign Up"
              description="Access your account or create a new one."
              to="/auth"
              icon="/Logo.png"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
"use client";

import React, { useEffect } from 'react';
import Tile from '@/components/Tile';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Loader2, Info, AlertCircle } from 'lucide-react'; // Added AlertCircle import
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IncidentService } from '@/services/IncidentService'; // Removed INCIDENTS_PER_PAGE
import { handleError } from '@/utils/errorHandler';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import IncidentCard from '@/components/IncidentCard';
import { supabase } from '@/integrations/supabase/client';
import { IncidentRow } from '@/types/supabase'; // Import IncidentRow
import { useIsSubscribed } from '@/hooks/useIsSubscribed'; // Import useIsSubscribed
import SubscribeOverlay from '@/components/SubscribeOverlay'; // Import SubscribeOverlay
import TeaserIncident from '@/components/TeaserIncident'; // Import TeaserIncident

// Log imports for debugging
if (import.meta.env.DEV) {
  console.log('HomePage imports:', { Tile, IncidentCard });
}

const HomePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading, error: isAdminError } = useIsAdmin();
  const { isSubscribed, loading: isSubscribedLoading } = useIsSubscribed();
  const queryClient = useQueryClient();

  const canAccessContent = isSubscribed || isAdmin;

  const { data: latestIncident, isLoading: isLoadingIncident, isError: isIncidentError, error: incidentError } = useQuery<IncidentRow | null, Error>({
    queryKey: ['incidents', 'latest'],
    queryFn: async () => {
      // Fetch only 1 incident using the new limit parameter
      const incidents = await IncidentService.fetchIncidents(0, {}, 1); 
      return incidents.length > 0 ? incidents[0] as IncidentRow : null; // Cast to IncidentRow
    },
    staleTime: 1000 * 10, // Keep fresh for 10 seconds
  });

  useEffect(() => {
    if (isIncidentError) {
      handleError(incidentError, 'Failed to load the most recent incident.');
    }
  }, [isIncidentError, incidentError]);

  // Real-time subscription for incidents to keep the latest incident updated
  useEffect(() => {
    const channel = supabase
      .channel('latest_incident_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        queryClient.invalidateQueries({ queryKey: ['incidents', 'latest'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  if (isAdminLoading || authLoading || isSubscribedLoading) {
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
          <h2 className="tw-text-2xl tw-font-bold tw-text-foreground">Most Recent Incident</h2>
        </div>

        <div className={`tw-relative ${!canAccessContent ? 'tw-min-h-[300px]' : ''}`}>
          {isLoadingIncident ? (
            <Card className="tw-bg-card tw-border-border tw-shadow-md">
              <CardContent className="tw-flex tw-items-center tw-justify-center tw-py-8">
                <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" aria-label="Loading most recent incident" />
                <span className="tw-ml-2 tw-text-muted-foreground">Loading incident...</span>
              </CardContent>
            </Card>
          ) : latestIncident ? (
            <>
              {canAccessContent ? (
                <IncidentCard incident={latestIncident} />
              ) : (
                <div className="tw-relative tw-blur-sm tw-pointer-events-none">
                  <TeaserIncident />
                </div>
              )}
            </>
          ) : (
            <Card className="tw-bg-card tw-border-border tw-shadow-md">
              <CardContent className="tw-py-8 tw-text-center tw-text-muted-foreground">
                <Info className="tw-h-12 tw-w-12 tw-mx-auto tw-mb-4" />
                No recent incidents available.
              </CardContent>
            </Card>
          )}
          {!canAccessContent && latestIncident && <SubscribeOverlay />}
        </div>
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
      <div className="tw-text-center tw-text-xs tw-text-muted-foreground tw-mt-8 tw-px-4">
        <p>
          The Western Prince William Scanner Feed is not affiliated with any local, state, or federal agency.
          Not all calls will be reported; it is the sole discretion of Western Prince William Scanner Feed to post or not to post incidents.
        </p>
      </div>
    </div>
  );
};

export default HomePage;
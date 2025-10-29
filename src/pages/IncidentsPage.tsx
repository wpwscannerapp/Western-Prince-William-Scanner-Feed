"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import IncidentCard from '@/components/IncidentCard';
import SubscribeOverlay from '@/components/SubscribeOverlay';
import IncidentForm from '@/components/IncidentForm';
import { Incident, IncidentService, INCIDENTS_PER_PAGE } from '@/services/IncidentService';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Info } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { handleError } from '@/utils/errorHandler';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

const IncidentsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const { isSubscribed, loading: isSubscribedLoading } = useIsSubscribed();
  const [incidentFormLoading, setIncidentFormLoading] = useState(false);
  const queryClient = useQueryClient();
  const observer = useRef<IntersectionObserver | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
      AnalyticsService.trackEvent({ name: 'incidents_page_redirect', properties: { reason: 'unauthenticated' } });
    }
  }, [authLoading, user, navigate]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery<Incident[], Error>({
    queryKey: ['incidents'],
    queryFn: async ({ pageParam = 0 }) => {
      const fetchedIncidents = await IncidentService.fetchIncidents(pageParam as number);
      return fetchedIncidents;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < INCIDENTS_PER_PAGE) {
        return undefined;
      }
      return allPages.flat().length;
    },
    staleTime: 1000 * 60,
    initialPageParam: 0,
    enabled: !!user && !authLoading,
  });

  const incidents = data?.pages.flat() || [];

  const lastIncidentRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage || !hasNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
            AnalyticsService.trackEvent({ name: 'incidents_feed_scrolled_to_end' });
          }
        },
        { threshold: 0.1 }
      );
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const handleCreateIncident = async (type: string, location: string, description: string, imageFile: File | null, _currentImageUrl: string | undefined, latitude: number | undefined, longitude: number | undefined) => {
    if (!user) {
      toast.error('You must be logged in to create an incident.');
      AnalyticsService.trackEvent({ name: 'create_incident_attempt_failed', properties: { reason: 'not_logged_in' } });
      return false;
    }

    setIncidentFormLoading(true);
    toast.loading('Submitting incident...', { id: 'create-incident' });

    try {
      const title = `${type} at ${location}`;
      const newIncident = await IncidentService.createIncident({
        title,
        description,
        type,
        location,
        date: new Date().toISOString(),
      }, imageFile, latitude, longitude, user.id);
      
      if (newIncident) {
        toast.success('Incident submitted successfully!', { id: 'create-incident' });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        AnalyticsService.trackEvent({ name: 'incident_created_from_feed', properties: { incidentId: newIncident.id, type, location } });
        return true;
      } else {
        handleError(null, 'Failed to submit incident.');
        AnalyticsService.trackEvent({ name: 'create_incident_failed_from_feed', properties: { type, location } });
        return false;
      }
    } catch (err) {
      handleError(err, 'An error occurred while submitting the incident.');
      AnalyticsService.trackEvent({ name: 'create_incident_error_from_feed', properties: { type, location, error: (err as Error).message } });
      return false;
    } finally {
      setIncidentFormLoading(false);
    }
  };

  const handleRetry = () => {
    refetch();
    AnalyticsService.trackEvent({ name: 'incidents_page_retry_fetch' });
  };

  if (authLoading || !user || isAdminLoading || isSubscribedLoading || isLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading incidents" />
        <p className="tw-ml-2">Loading incidents...</p>
      </div>
    );
  }

  if (isError) {
    AnalyticsService.trackEvent({ name: 'incidents_page_load_failed', properties: { error: error?.message } });
    return (
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error Loading Incidents</h1>
          <p className="tw-text-muted-foreground">{error?.message || 'An unexpected error occurred.'}</p>
          <Button onClick={handleRetry}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Incidents Feed</h1>
      <p className="tw-text-center tw-text-muted-foreground tw-mb-8">
        Real-time scanner updates for Western Prince William.
      </p>

      {isAdmin && (
        <div className="tw-bg-background tw-p-4 tw-shadow-md tw-mb-8 tw-rounded-lg">
          <h2 className="tw-2xl tw-font-semibold tw-text-foreground tw-mb-4">Submit New Incident</h2>
          <IncidentForm
            onSubmit={handleCreateIncident}
            isLoading={incidentFormLoading}
          />
        </div>
      )}

      <div className={`tw-space-y-6 ${!isSubscribed && !isAdmin ? 'tw-relative' : ''}`} aria-live="polite">
        <div className={!isSubscribed && !isAdmin ? 'tw-blur-sm tw-pointer-events-none' : ''}>
          {incidents.length === 0 && !isLoading && (
            <div className="tw-text-center tw-py-12 tw-col-span-full">
              <Info className="tw-h-12 tw-w-12 tw-text-muted-foreground tw-mx-auto tw-mb-4" aria-hidden="true" />
              <p className="tw-text-muted-foreground tw-mb-4 tw-text-lg">No incidents available yet. Check back soon!</p>
              {isAdmin && (
                <Button onClick={handleRetry} variant="outline">
                  Refresh
                </Button>
              )}
            </div>
          )}
          
          {incidents.map((incident, index) => (
            <div key={incident.id} ref={index === incidents.length - 1 ? lastIncidentRef : null} className="tw-transition tw-duration-300 hover:tw-shadow-lg">
              <IncidentCard incident={incident} />
            </div>
          ))}
          
          {isFetchingNextPage && (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-8 tw-gap-2 tw-text-muted-foreground tw-col-span-full">
              <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" aria-hidden="true" />
              <span>Loading more incidents...</span>
            </div>
          )}
          
          {!hasNextPage && !isLoading && incidents.length > 0 && (
            <p className="tw-text-center tw-text-muted-foreground tw-py-4 tw-col-span-full">You've reached the end of the feed.</p>
          )}
        </div>
        {!isSubscribed && !isAdmin && <SubscribeOverlay />}
      </div>
    </div>
  );
};

export default IncidentsPage;
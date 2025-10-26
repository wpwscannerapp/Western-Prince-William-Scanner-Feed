import React, { useState, useCallback, useRef } from 'react';
import IncidentCard from '@/components/IncidentCard'; // Changed from PostCard
import SubscribeOverlay from '@/components/SubscribeOverlay';
import IncidentForm from '@/components/IncidentForm'; // Changed from PostForm
import { Incident, IncidentService, INCIDENTS_PER_PAGE } from '@/services/IncidentService'; // Changed from Post and PostService
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Info } from 'lucide-react'; // Changed from ArrowUp, MessageCircle
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { handleError } from '@/utils/errorHandler';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

const IncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const { isSubscribed, loading: isSubscribedLoading } = useIsSubscribed();
  const [incidentFormLoading, setIncidentFormLoading] = useState(false); // Renamed from postFormLoading
  const queryClient = useQueryClient();
  const observer = useRef<IntersectionObserver | null>(null);
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery<Incident[], Error>({ // Changed type to Incident[]
    queryKey: ['incidents'], // Changed query key
    queryFn: async ({ pageParam = 0 }) => {
      const fetchedIncidents = await IncidentService.fetchIncidents(pageParam as number); // Changed to IncidentService
      return fetchedIncidents;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < INCIDENTS_PER_PAGE) { // Changed to INCIDENTS_PER_PAGE
        return undefined;
      }
      return allPages.flat().length;
    },
    staleTime: 1000 * 60,
    initialPageParam: 0,
  });

  const incidents = data?.pages.flat() || []; // Renamed from posts

  const lastIncidentRef = useCallback( // Renamed from lastPostRef
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage || !hasNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Removed real-time subscription for 'posts' as this page now handles 'incidents'
  // and 'alerts' are handled on the HomePage.

  const handleCreateIncident = async (type: string, location: string, description: string, imageFile: File | null, latitude: number | undefined, longitude: number | undefined) => {
    if (!user) {
      toast.error('You must be logged in to create an incident.');
      return false;
    }

    setIncidentFormLoading(true);
    toast.loading('Submitting incident...', { id: 'create-incident' });

    try {
      const title = `${type} at ${location}`; // Generate title from type and location
      const newIncident = await IncidentService.createIncident({
        title,
        description,
        type,
        location,
        date: new Date().toISOString(), // Set current date/time
      }, imageFile, latitude, longitude);
      
      if (newIncident) {
        toast.success('Incident submitted successfully!', { id: 'create-incident' });
        queryClient.invalidateQueries({ queryKey: ['incidents'] }); // Invalidate to refetch and show new incident
        return true;
      } else {
        handleError(null, 'Failed to submit incident.');
        return false;
      }
    } catch (err) {
      handleError(err, 'An error occurred while submitting the incident.');
      return false;
    } finally {
      setIncidentFormLoading(false);
    }
  };

  const handleRetry = () => {
    refetch();
  };

  if (isAdminLoading || isSubscribedLoading || isLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading incidents...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error Loading Archive</h1>
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
          
          {incidents.map((incident, index) => ( // Changed to incidents.map and IncidentCard
            <div key={incident.id} ref={index === incidents.length - 1 ? lastIncidentRef : null} className="tw-transition tw-duration-300 hover:tw-shadow-lg">
              <IncidentCard incident={incident} />
            </div>
          ))}
          
          {isFetchingNextPage && (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-8 tw-gap-2 tw-text-muted-foreground tw-col-span-full">
              <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
              <span>Loading more incidents...</span>
            </div>
          )}
          
          {!hasNextPage && !isLoading && incidents.length > 0 && (
            <p className="tw-text-center tw-text-muted-foreground tw-py-4 tw-col-span-full">You've reached the end of the feed.</p>
          )}
        </div>
        {!isSubscribed && !isAdmin && <SubscribeOverlay />}
      </div>

      {/* Removed newPostsAvailable button as this page now displays incidents, not posts */}
    </div>
  );
};

export default IncidentsPage;
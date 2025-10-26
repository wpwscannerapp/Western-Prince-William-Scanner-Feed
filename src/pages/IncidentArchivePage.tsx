import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, Info } from 'lucide-react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { IncidentService, Incident, IncidentFilter, INCIDENTS_PER_PAGE } from '@/services/IncidentService';
import { handleError } from '@/utils/errorHandler';
import IncidentSearchForm from '@/components/IncidentSearchForm';
import IncidentCard from '@/components/IncidentCard';
import SkeletonLoader from '@/components/SkeletonLoader';

const IncidentArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<IncidentFilter>({});
  const observer = useRef<IntersectionObserver | null>(null);

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
    queryKey: ['incidents', filters],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('IncidentArchivePage: Fetching incidents with offset', pageParam, 'and filters', filters);
      const fetchedIncidents = await IncidentService.fetchIncidents(pageParam as number, filters);
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
  });

  const incidents = data?.pages.flat() || [];

  const handleFilterChange = useCallback((newFilters: IncidentFilter) => {
    console.log('IncidentArchivePage: Filter change detected. New filters:', newFilters);
    setFilters(newFilters);
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  }, [queryClient]);

  const lastIncidentRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage || !hasNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasNextPage) {
            console.log('IncidentArchivePage: IntersectionObserver triggered, fetching next page.');
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  if (isError) {
    handleError(error, 'Failed to load incident archive.');
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error Loading Archive</h1>
          <p className="tw-text-muted-foreground">{error?.message || 'An unexpected error occurred.'}</p>
          <Button onClick={() => refetch()} className="tw-mt-4 tw-button">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-3xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Incident Archive</h1>
      <p className="tw-text-center tw-text-muted-foreground tw-mb-8">
        Search and filter past incidents by keywords, type, location, and date.
      </p>

      <IncidentSearchForm onFilterChange={handleFilterChange} initialFilters={filters} />

      <div className="tw-mt-8 tw-space-y-6">
        {(isLoading && !isFetchingNextPage) ? (
          <SkeletonLoader count={3} className="tw-col-span-full" />
        ) : incidents.length === 0 ? (
          <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12 tw-text-muted-foreground">
            <Info className="tw-h-12 tw-w-12 tw-mb-4" />
            <p className="tw-text-lg">No incidents found matching your criteria.</p>
          </div>
        ) : (
          incidents.map((incident, index) => (
            <div key={incident.id} ref={index === incidents.length - 1 ? lastIncidentRef : null}>
              <IncidentCard incident={incident} />
            </div>
          ))
        )}

        {isFetchingNextPage && (
          <div className="tw-flex tw-justify-center tw-items-center tw-py-8 tw-gap-2 tw-text-muted-foreground">
            <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
            <span>Loading more incidents...</span>
          </div>
        )}

        {!hasNextPage && !isLoading && incidents.length > 0 && (
          <p className="tw-text-center tw-text-muted-foreground tw-py-4">You've reached the end of the archive.</p>
        )}
      </div>
    </div>
  );
};

export default IncidentArchivePage;
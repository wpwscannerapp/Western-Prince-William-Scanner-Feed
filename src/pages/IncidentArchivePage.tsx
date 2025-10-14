import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, Info } from 'lucide-react'; // Removed unused 'Archive' import
import { useQuery } from '@tanstack/react-query';
import { IncidentService, Incident, IncidentFilter, INCIDENTS_PER_PAGE } from '@/services/IncidentService';
import { handleError } from '@/utils/errorHandler';
import IncidentSearchForm from '@/components/IncidentSearchForm';
import IncidentCard from '@/components/IncidentCard';
import SkeletonLoader from '@/components/SkeletonLoader';

const IncidentArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<IncidentFilter>({});
  const [page, setPage] = useState(0);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const { data, isLoading, isFetching, isError, error } = useQuery<Incident[], Error>({
    queryKey: ['incidents', page, filters],
    queryFn: () => IncidentService.fetchIncidents(page, filters),
    staleTime: 1000 * 60, // Cache for 1 minute
    placeholderData: (previousData) => previousData ?? [], // Replaced keepPreviousData with placeholderData
  });

  useEffect(() => {
    if (data) {
      if (page === 0) {
        setAllIncidents(data);
      } else {
        setAllIncidents(prev => {
          const newIncidents = (data as Incident[]).filter( // Explicitly cast data and type newItem
            (newItem: Incident) => !prev.some(existingItem => existingItem.id === newItem.id)
          );
          return [...prev, ...newIncidents];
        });
      }
      setHasMore(data.length === INCIDENTS_PER_PAGE);
    }
  }, [data, page]);

  // Reset page and incidents when filters change
  const handleFilterChange = useCallback((newFilters: IncidentFilter) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page on filter change
    setAllIncidents([]); // Clear incidents to show loading state for new filters
    setHasMore(true);
  }, []);

  const lastIncidentRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetching || !hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMore) {
            setPage(prev => prev + 1);
          }
        },
        { threshold: 0.1 }
      );
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetching, hasMore]
  );

  if (isError) {
    handleError(error, 'Failed to load incident archive.');
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error Loading Archive</h1>
          <p className="tw-text-muted-foreground">{error?.message || 'An unexpected error occurred.'}</p>
          <Button onClick={() => navigate('/home')} className="tw-mt-4 tw-button">Go to Home Page</Button>
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
        {(isLoading && page === 0) || (isFetching && allIncidents.length === 0) ? (
          <SkeletonLoader count={3} className="tw-col-span-full" />
        ) : allIncidents.length === 0 ? (
          <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12 tw-text-muted-foreground">
            <Info className="tw-h-12 tw-w-12 tw-mb-4" />
            <p className="tw-text-lg">No incidents found matching your criteria.</p>
          </div>
        ) : (
          allIncidents.map((incident, index) => (
            <div key={incident.id} ref={index === allIncidents.length - 1 ? lastIncidentRef : null}>
              <IncidentCard incident={incident} />
            </div>
          ))
        )}

        {(isFetching && allIncidents.length > 0) && (
          <div className="tw-flex tw-justify-center tw-items-center tw-py-8 tw-gap-2 tw-text-muted-foreground">
            <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
            <span>Loading more incidents...</span>
          </div>
        )}

        {!hasMore && !isFetching && allIncidents.length > 0 && (
          <p className="tw-text-center tw-text-muted-foreground tw-py-4">You've reached the end of the archive.</p>
        )}
      </div>
    </div>
  );
};

export default IncidentArchivePage;
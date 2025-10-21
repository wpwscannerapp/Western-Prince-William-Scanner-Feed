import React, { useEffect } from 'react'; // Added useEffect
import Tile from '@/components/Tile';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Loader2, AlertCircle } from 'lucide-react';

const HomePage: React.FC = () => {
  console.log('HomePage: Component rendering.');
  const { isAdmin, loading: isAdminLoading, error: isAdminError } = useIsAdmin();

  // Added useEffect for logging to see state changes over time
  useEffect(() => {
    console.log('HomePage useEffect: isAdminLoading changed to', isAdminLoading, 'isAdmin:', isAdmin, 'error:', isAdminError);
  }, [isAdminLoading, isAdmin, isAdminError]);

  console.log('HomePage: Current isAdminLoading state:', isAdminLoading, 'isAdmin:', isAdmin, 'error:', isAdminError);

  if (isAdminError) {
    console.log('HomePage: Error loading permissions:', isAdminError);
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <AlertCircle className="tw-h-12 tw-w-12 tw-text-destructive tw-mb-4" />
        <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error Loading Permissions</h1>
        <p className="tw-text-muted-foreground">{isAdminError}</p>
        <button
          className="tw-mt-4 tw-px-4 tw-py-2 tw-bg-primary tw-text-primary-foreground tw-rounded-md hover:tw-bg-primary/90 tw-transition-colors"
          onClick={() => {
            localStorage.removeItem('supabase.auth.token'); // Clear stale session
            window.location.reload(); // Hard reload
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Only show loading spinner if it's truly loading and not just a quick re-render
  if (isAdminLoading) {
    console.log('HomePage: Displaying loading permissions UI.');
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading user permissions...</p>
      </div>
    );
  }

  // If not loading and no error, then render the content
  console.log('HomePage: Rendering main content.');
  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-6xl">
      <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
        {/* Incidents Tile */}
        <Tile
          title="Incidents"
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

        {/* Admin Dashboard Tile (Conditional) */}
        {isAdmin && (
          <Tile
            title="Admin Dashboard"
            description="Manage posts, settings, and users."
            to="/admin"
            icon="/Logo.png"
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
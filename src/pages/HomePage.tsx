import React from 'react';
import Tile from '@/components/Tile';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Corrected import path
import { testProfileQuery } from '@/utils/testQuery';
import { Button } from '@/components/ui/button';

const HomePage: React.FC = () => {
  console.log('HomePage: Component rendering.');
  const { session } = useAuth(); // Get session
  const { isAdmin, loading: isAdminLoading, error: isAdminError } = useIsAdmin();

  console.log('HomePage: isAdminLoading:', isAdminLoading, 'isAdmin:', isAdmin, 'error:', isAdminError);

  // The authReady check is primarily handled by ProtectedRoute.
  // We only need to show a loading state if there's an error in determining admin status.

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
        {isAdminLoading ? (
          <div className="tw-flex tw-items-center tw-justify-center tw-p-4 tw-bg-card tw-border-border tw-shadow-lg tw-rounded-lg">
            <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
            <p className="tw-ml-2 tw-text-sm tw-text-muted-foreground">Loading admin status...</p>
          </div>
        ) : (
          isAdmin && (
            <Tile
              title="Admin Dashboard"
              description="Manage posts, settings, and users."
              to="/admin"
              icon="/Logo.png"
            />
          )
        )}
      </div>
      {/* Debug Button for testing queries */}
      <div className="tw-mt-8 tw-text-center">
        <Button onClick={() => testProfileQuery(session)} variant="outline">
          Test Profile Query (Debug)
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
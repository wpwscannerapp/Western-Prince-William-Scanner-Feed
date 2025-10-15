import React from 'react';
import Tile from '@/components/Tile';
import { useIsAdmin } from '@/hooks/useIsAdmin'; // Import useIsAdmin
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading state
// Removed unused 'Archive' and 'BellRing' imports

const HomePage: React.FC = () => {
  const { isAdmin, loading: isAdminLoading } = useIsAdmin(); // Use the useIsAdmin hook

  if (isAdminLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading user permissions...</p>
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

        {/* Traffic Info Tile */}
        <Tile
          title="Traffic Info"
          description="Current road conditions and traffic alerts."
          to="/home/traffic"
          icon="/Logo.png"
        />

        {/* Incident Archive Tile */}
        <Tile
          title="Incident Archive"
          description="Search past incidents and trends."
          to="/home/archive"
          icon="/Logo.png" // Using Logo.png as a placeholder, consider a specific archive icon if available
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
            icon="/Logo.png" // You might want a different icon for admin
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
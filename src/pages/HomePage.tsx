import React from 'react';
import Tile from '@/components/Tile'; // Import the new Tile component
import IncidentsTile from '@/components/IncidentsTile'; // Import the new IncidentsTile component
import { CardContent } from '@/components/ui/card'; // Only CardContent is used for placeholders

const HomePage: React.FC = () => {
  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-6xl"> {/* Increased max-width for dashboard */}
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-8 tw-text-foreground tw-text-center">Dashboard</h1>
      
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
        {/* Incidents Tile (formerly the main Home Feed content) */}
        <Tile title="Incidents" description="Real-time scanner updates.">
          <IncidentsTile />
        </Tile>

        {/* Placeholder for another tile: Weather Updates */}
        <Tile title="Weather Updates" description="Local weather conditions and alerts.">
          <CardContent className="tw-p-4 tw-text-center">
            <p className="tw-text-muted-foreground">Weather information coming soon!</p>
            <img src="/placeholder.svg" alt="Weather icon" className="tw-h-24 tw-w-24 tw-mx-auto tw-my-4 tw-text-muted-foreground" />
            <p className="tw-text-sm tw-text-muted-foreground">Stay tuned for real-time weather data.</p>
          </CardContent>
        </Tile>

        {/* Placeholder for another tile: Traffic Info */}
        <Tile title="Traffic Info" description="Current road conditions and traffic alerts.">
          <CardContent className="tw-p-4 tw-text-center">
            <p className="tw-text-muted-foreground">Traffic information coming soon!</p>
            <img src="/placeholder.svg" alt="Traffic icon" className="tw-h-24 tw-w-24 tw-mx-auto tw-my-4 tw-text-muted-foreground" />
            <p className="tw-text-sm tw-text-muted-foreground">Get updates on local road incidents.</p>
          </CardContent>
        </Tile>
      </div>
    </div>
  );
};

export default HomePage;
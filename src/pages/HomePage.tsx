import React from 'react';
import Tile from '@/components/Tile'; // Import the new Tile component

const HomePage: React.FC = () => {
  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-6xl"> {/* Increased max-width for dashboard */}
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-8 tw-text-foreground tw-text-center">Dashboard</h1>
      
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
        {/* Incidents Tile */}
        <Tile 
          title="Incidents" 
          description="Real-time scanner updates." 
          to="/home/incidents" 
          icon="/Logo.png" 
        />

        {/* Weather Updates Tile */}
        <Tile 
          title="Weather Updates" 
          description="Local weather conditions and alerts." 
          to="/home/weather" 
          icon="/Logo.png" 
        />

        {/* Traffic Info Tile */}
        <Tile 
          title="Traffic Info" 
          description="Current road conditions and traffic alerts." 
          to="/home/traffic" 
          icon="/Logo.png" 
        />
      </div>
    </div>
  );
};

export default HomePage;
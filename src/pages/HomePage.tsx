import React from 'react';
import Tile from '@/components/Tile'; // Import the new Tile component

const HomePage: React.FC = () => {
  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-6xl">
      
      <div className="tw-grid tw-grid-cols-3 tw-gap-6"> {/* Changed to 3 columns for all screen sizes */}
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

        {/* Contact Us Tile */}
        <Tile
          title="Contact Us"
          description="Get in touch with us."
          to="/home/contact-us"
          icon="/Logo.png"
        />
      </div>
    </div>
  );
};

export default HomePage;
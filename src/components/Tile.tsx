import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface TileProps {
  title: string;
  description?: string;
  to: string; // Path to navigate to
  icon: string; // URL for the icon image (e.g., /Logo.png)
}

const Tile: React.FC<TileProps> = ({ title, description, to, icon }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(to);
  };

  // Use Netlify Image CDN for local paths to optimize image size
  let finalIconUrl = icon;
  if (icon.startsWith('/')) {
    // Construct absolute URL for local assets
    finalIconUrl = `${window.location.origin}${icon}`;
  }

  const optimizedIconSrc = `/.netlify/images?url=${encodeURIComponent(finalIconUrl)}&w=48&h=48&fit=contain&fm=auto`;

  return (
    <Card 
      className="tw-bg-card tw-border-border tw-shadow-lg tw-h-full tw-flex tw-flex-col tw-cursor-pointer hover:tw-shadow-xl hover:tw-border-primary tw-transition-all tw-duration-200"
      onClick={handleClick}
    >
      <CardHeader className="tw-flex tw-flex-col tw-items-center tw-text-center tw-pb-2">
        <img src={optimizedIconSrc} alt={`${title} icon`} className="tw-h-12 tw-w-12 tw-mb-3" />
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground">{title}</CardTitle>
        {description && <CardDescription className="tw-text-muted-foreground">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="tw-flex-grow tw-p-4 tw-flex tw-items-center tw-justify-center">
        {/* Content for the tile itself, if any, can go here. For now, it's just the header. */}
      </CardContent>
    </Card>
  );
};

export default Tile;
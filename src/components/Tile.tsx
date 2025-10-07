import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TileProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const Tile: React.FC<TileProps> = ({ title, description, children }) => {
  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg tw-h-full tw-flex tw-flex-col">
      <CardHeader>
        <CardTitle className="tw-text-xl tw-font-bold tw-text-foreground">{title}</CardTitle>
        {description && <CardDescription className="tw-text-muted-foreground">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="tw-flex-grow tw-p-0"> {/* Remove default padding, let children handle it */}
        {children}
      </CardContent>
    </Card>
  );
};

export default Tile;
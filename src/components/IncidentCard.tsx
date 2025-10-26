import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, MapPin, Tag, FileText } from 'lucide-react';
import { Incident } from '@/services/IncidentService';
import { format } from 'date-fns';

interface IncidentCardProps {
  incident: Incident;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ incident }) => {
  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-md tw-text-foreground tw-rounded-lg">
      <CardHeader className="tw-pb-2">
        <CardTitle className="tw-text-xl tw-font-bold">{incident.title}</CardTitle>
        <CardDescription className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-muted-foreground">
          <CalendarDays className="tw-h-4 tw-w-4" />
          {format(new Date(incident.date), 'MMM dd, yyyy, hh:mm a')}
        </CardDescription>
      </CardHeader>
      <CardContent className="tw-pt-2 tw-space-y-2">
        <p className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <MapPin className="tw-h-4 tw-w-4 tw-text-primary" />
          <span className="tw-font-medium">{incident.location}</span>
        </p>
        <p className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <Tag className="tw-h-4 tw-w-4 tw-text-secondary" />
          <span className="tw-font-medium">{incident.type}</span>
        </p>
        {incident.image_url && (
          <img
            src={incident.image_url}
            alt="Incident image"
            className="tw-w-full tw-max-h-80 tw-object-cover tw-rounded-md tw-mb-4 tw-border tw-border-border"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Optionally show a broken image icon or text
            }}
          />
        )}
        <p className="tw-flex tw-items-start tw-gap-2 tw-text-sm tw-text-muted-foreground tw-whitespace-pre-wrap">
          <FileText className="tw-h-4 tw-w-4 tw-flex-shrink-0" />
          {incident.description}
        </p>
      </CardContent>
    </Card>
  );
};

export default IncidentCard;
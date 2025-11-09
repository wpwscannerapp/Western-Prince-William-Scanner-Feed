import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CalendarDays, MapPin, Tag, FileText, Heart, MessageCircle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TeaserIncident = () => {
  // Mock data for the teaser
  const mockIncident = {
    title: "Structure Fire - Commercial Building",
    location: "123 Main St, Gainesville, VA",
    type: "Fire",
    description: "Units dispatched to a reported commercial structure fire. Heavy smoke visible from a distance. EMS on standby. Avoid the area.",
    date: new Date().toISOString(),
    imageUrl: "/placeholder.svg",
  };

  return (
    <Card className="tw-w-full tw-max-w-md tw-bg-card tw-border-border tw-shadow-md tw-text-foreground tw-rounded-lg tw-cursor-default">
      <CardHeader className="tw-pb-2 tw-px-4 tw-pt-4">
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
          <p className="tw-text-sm tw-text-muted-foreground tw-font-medium tw-flex tw-items-center tw-gap-2">
            <CalendarDays className="tw-h-4 tw-w-4" aria-hidden="true" /> {mockIncident.date ? new Date(mockIncident.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Loading...'}
          </p>
          <Badge variant="secondary" className="tw-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5">
            <Shield className="tw-h-3 tw-w-3" aria-hidden="true" />
            Sample Post
          </Badge>
        </div>
        <CardTitle className="tw-xl tw-font-bold">{mockIncident.title}</CardTitle>
      </CardHeader>
      <CardContent className="tw-pt-2 tw-px-4 tw-space-y-2">
        <p className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <MapPin className="tw-h-4 tw-w-4 tw-text-primary" aria-hidden="true" />
          <span className="tw-font-medium">{mockIncident.location}</span>
        </p>
        <p className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <Tag className="tw-h-4 tw-w-4 tw-text-secondary" aria-hidden="true" />
          <span className="tw-font-medium">{mockIncident.type}</span>
        </p>
        
        <p className="tw-flex tw-items-start tw-gap-2 tw-text-sm tw-text-foreground tw-whitespace-pre-wrap">
          <FileText className="tw-h-4 tw-w-4 tw-flex-shrink-0 tw-text-muted-foreground" aria-hidden="true" />
          {mockIncident.description}
        </p>

        {mockIncident.imageUrl && (
          <img
            src={mockIncident.imageUrl}
            alt="Sample incident image"
            className="tw-w-full tw-h-auto tw-max-h-80 tw-object-cover tw-rounded-md tw-mb-4 tw-border tw-border-border"
            loading="lazy"
          />
        )}
      </CardContent>
      <CardFooter className="tw-flex tw-flex-col tw-items-start tw-pt-0 tw-pb-4 tw-px-4">
        <div className="tw-flex tw-justify-between tw-w-full tw-mb-2">
          <div className="tw-text-muted-foreground tw-flex tw-items-center tw-gap-2">
            <Heart className="tw-h-4 tw-w-4" aria-hidden="true" /> 12 Likes
          </div>
          <div className="tw-text-muted-foreground tw-flex tw-items-center tw-gap-2">
            <MessageCircle className="tw-h-4 tw-w-4" aria-hidden="true" /> 5 Comments
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TeaserIncident;
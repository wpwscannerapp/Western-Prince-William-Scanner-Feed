import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

const TeaserIncident = () => {
  return (
    <Card className="tw-w-full tw-max-w-md tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        {/* Directly using h2 for proper heading hierarchy and applying CardTitle styling */}
        <h2 className="tw-text-2xl tw-font-semibold tw-leading-none tw-tracking-tight tw-text-primary dark:tw-text-primary-foreground">
          Sample Incident Update
        </h2>
        <CardDescription className="tw-text-muted-foreground dark:tw-text-foreground">A glimpse of what you're missing!</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="tw-text-foreground tw-mb-2">
          **INCIDENT:** Structure Fire - Commercial Building
        </p>
        <p className="tw-text-sm tw-text-muted-foreground dark:tw-text-foreground tw-mb-4">
          **LOCATION:** 123 Main St, Gainesville, VA. Units dispatched to a reported commercial structure fire. Heavy smoke visible from a distance. EMS on standby. Avoid the area.
        </p>
        <img
          src="/placeholder.svg" // Placeholder for a relevant image
          alt="Fire incident"
          className="tw-w-full tw-h-48 tw-object-cover tw-rounded-md tw-mb-2 tw-block"
        />
        <p className="tw-text-xs tw-text-muted-foreground dark:tw-text-foreground">Posted: 1 hour ago</p>
      </CardContent>
    </Card>
  );
};

export default TeaserIncident;
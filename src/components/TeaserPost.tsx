import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TeaserPost = () => {
  return (
    <Card className="w-full max-w-md bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-primary">Sample Scanner Update</CardTitle>
        <CardDescription className="text-muted-foreground">A glimpse of what you're missing!</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-foreground mb-2">
          **INCIDENT:** Structure Fire - Commercial Building
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          **LOCATION:** 123 Main St, Gainesville, VA. Units dispatched to a reported commercial structure fire. Heavy smoke visible from a distance. EMS on standby. Avoid the area.
        </p>
        <img
          src="/placeholder.svg" // Placeholder for a relevant image
          alt="Fire incident"
          className="w-full h-48 object-cover rounded-md mb-2"
        />
        <p className="text-xs text-gray-500">Posted: 1 hour ago</p>
      </CardContent>
    </Card>
  );
};

export default TeaserPost;
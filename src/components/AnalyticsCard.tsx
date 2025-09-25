import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { PostService } from '@/services/PostService';
import { toast } from 'sonner';

const AnalyticsCard: React.FC = () => {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriberData = async () => {
    setLoading(true);
    const count = await PostService.fetchSubscriberCount();
    if (count !== null) {
      setSubscriberCount(count);
    } else {
      toast.error('Failed to fetch subscriber count.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscriberData();
  }, []);

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : subscriberCount}
        </div>
        <p className="text-xs text-muted-foreground">
          Users with 'trialing' or 'active' subscription status.
        </p>
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard;
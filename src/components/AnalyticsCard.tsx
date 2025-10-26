import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { IncidentService } from '@/services/IncidentService';
import { toast } from 'sonner';

const AnalyticsCard: React.FC = () => {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriberData = async () => {
    setLoading(true);
    const count = await IncidentService.fetchSubscriberCount();
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
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader className="tw-flex tw-flex-row tw-items-center tw-justify-between tw-space-y-0 tw-pb-2">
        <CardTitle className="tw-text-sm tw-font-medium">Active Subscribers</CardTitle>
        <Users className="tw-h-4 tw-w-4 tw-text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="tw-text-2xl tw-font-bold">
          {loading ? <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" /> : subscriberCount}
        </div>
        <p className="tw-text-xs tw-text-muted-foreground">
          Users with 'trialing' or 'active' subscription status.
        </p>
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard;
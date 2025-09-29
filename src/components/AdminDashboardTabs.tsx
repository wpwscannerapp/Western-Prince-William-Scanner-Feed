import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PostForm } from '@/components/PostForm';
import AdminPostTable from '@/components/AdminPostTable';
import AnalyticsCard from '@/components/AnalyticsCard';
import AppSettingsForm from '@/components/AppSettingsForm';
import AdminNotificationSender from '@/components/AdminNotificationSender';
import { PostService } from '@/services/PostService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface AdminDashboardTabsProps {
  onPostTableRefresh: () => void;
}

interface SubscriptionData {
  date: string;
  count: number;
}

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ onPostTableRefresh }) => {
  const { user } = useAuth();
  const [postFormLoading, setPostFormLoading] = React.useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData[]>([]);

  const handleCreatePost = async (text: string, imageFile: File | null) => {
    if (!user) {
      toast.error('You must be logged in to create a post.');
      return false;
    }

    setPostFormLoading(true);
    toast.loading('Creating post...', { id: 'create-post' });
    const newPost = await PostService.createPost(text, imageFile, user.id);
    setPostFormLoading(false);

    if (newPost) {
      toast.success('Post created successfully!', { id: 'create-post' });
      onPostTableRefresh();
      return true;
    } else {
      toast.error('Failed to create post.', { id: 'create-post' });
      return false;
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      // Fetch subscription data grouped by date
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .in('subscription_status', ['trialing', 'active'])
        .order('created_at');

      if (error) throw error;

      // Process data to group by date
      const groupedData: Record<string, number> = {};
      data.forEach(profile => {
        const date = new Date(profile.created_at).toISOString().split('T')[0];
        groupedData[date] = (groupedData[date] || 0) + 1;
      });

      // Convert to array format for chart
      const chartData = Object.entries(groupedData).map(([date, count]) => ({
        date,
        count
      }));

      setSubscriptionData(chartData);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  return (
    <Tabs defaultValue="posts" className="tw-w-full">
      <TabsList className="tw-grid tw-w-full tw-grid-cols-4 tw-mb-6">
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="posts" className="tw-space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
            <CardDescription>Share updates with your subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            <PostForm
              onSubmit={handleCreatePost}
              isLoading={postFormLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manage Posts</CardTitle>
            <CardDescription>View, edit, or delete existing posts</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPostTable onPostUpdated={onPostTableRefresh} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics" className="tw-space-y-8">
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
          <AnalyticsCard />
          <Card>
            <CardHeader>
              <CardTitle>Subscription Growth</CardTitle>
              <CardDescription>Daily new subscribers</CardDescription>
            </CardHeader>
            <CardContent className="tw-h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={subscriptionData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="New Subscribers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>Post interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="tw-space-y-4">
                <div>
                  <div className="tw-flex tw-justify-between tw-mb-1">
                    <span className="tw-text-sm tw-font-medium">Likes</span>
                    <span className="tw-text-sm tw-font-medium">1,240</span>
                  </div>
                  <div className="tw-w-full tw-bg-secondary tw-rounded-full tw-h-2">
                    <div className="tw-bg-primary tw-h-2 tw-rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="tw-flex tw-justify-between tw-mb-1">
                    <span className="tw-text-sm tw-font-medium">Comments</span>
                    <span className="tw-text-sm tw-font-medium">856</span>
                  </div>
                  <div className="tw-w-full tw-bg-secondary tw-rounded-full tw-h-2">
                    <div className="tw-bg-primary tw-h-2 tw-rounded-full" style={{ width: '55%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="tw-flex tw-justify-between tw-mb-1">
                    <span className="tw-text-sm tw-font-medium">Shares</span>
                    <span className="tw-text-sm tw-font-medium">320</span>
                  </div>
                  <div className="tw-w-full tw-bg-secondary tw-rounded-full tw-h-2">
                    <div className="tw-bg-primary tw-h-2 tw-rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="settings" className="tw-space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>Customize your application</CardDescription>
          </CardHeader>
          <CardContent>
            <AppSettingsForm />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="notifications" className="tw-space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Send Push Notifications</CardTitle>
            <CardDescription>Reach out to your subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminNotificationSender />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AdminDashboardTabs;
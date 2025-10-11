import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PostForm from '@/components/PostForm';
import AdminPostTable from '@/components/AdminPostTable';
import AnalyticsCard from '@/components/AnalyticsCard';
import AppSettingsForm from '@/components/AppSettingsForm';
import AdminNotificationSender from '@/components/AdminNotificationSender';
import ContactSettingsForm from '@/components/ContactSettingsForm'; // New import
import { PostService } from '@/services/PostService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { handleError } from '@/utils/errorHandler';

interface AdminDashboardTabsProps {
  activeTab: string; // Prop to receive active tab from parent
}

interface SubscriptionData {
  date: string;
  count: number;
}

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ activeTab }) => { // Receive activeTab as prop
  const { user } = useAuth();
  const [postFormLoading, setPostFormLoading] = React.useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  // Removed internal activeTab state, now controlled by parent

  const refreshPostTable = useCallback(() => {
    // This function will be passed to AdminPostTable to trigger its internal refresh
    // AdminPostTable will manage its own data fetching.
  }, []);

  const handleCreatePost = async (text: string, imageFile: File | null) => {
    if (!user) {
      handleError(null, 'You must be logged in to create a post.');
      return false;
    }

    setPostFormLoading(true);
    try {
      toast.loading('Creating post...', { id: 'create-post' });
      const newPost = await PostService.createPost(text, imageFile, user.id);
      
      if (newPost) {
        toast.success('Post created successfully!', { id: 'create-post' });
        return true;
      } else {
        handleError(null, 'Failed to create post.');
        return false;
      }
    } catch (err: any) {
      handleError(err, 'An error occurred while creating the post.');
      return false;
    } finally {
      setPostFormLoading(false);
    }
  };

  const fetchSubscriptionData = async () => {
    setAnalyticsError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('updated_at, subscription_status')
        .in('subscription_status', ['trialing', 'active'])
        .order('updated_at');

      if (error) {
        handleError(error, 'Failed to fetch subscription data.');
        throw error;
      }

      const groupedData: Record<string, number> = {};
      data.forEach(profile => {
        const date = new Date(profile.updated_at).toISOString().split('T')[0];
        groupedData[date] = (groupedData[date] || 0) + 1;
      });

      const chartData = Object.entries(groupedData).map(([date, count]) => ({
        date,
        count
      }));

      setSubscriptionData(chartData);
    } catch (error) {
      setAnalyticsError(handleError(error, 'Failed to load subscription analytics.'));
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchSubscriptionData();
    }
  }, [activeTab]);

  const handleRetryAnalytics = () => {
    fetchSubscriptionData();
  };

  return (
    <Tabs value={activeTab} className="tw-w-full"> {/* Use value prop for controlled tabs */}
      <TabsList className="tw-grid tw-w-full tw-grid-cols-4 tw-mb-6 tw-hidden"> {/* Hide TabsList as navigation is via sidebar */}
        <TabsTrigger value="posts" aria-label="Posts tab">Posts</TabsTrigger>
        <TabsTrigger value="analytics" aria-label="Analytics tab">Analytics</TabsTrigger>
        <TabsTrigger value="settings" aria-label="Settings tab">Settings</TabsTrigger>
        <TabsTrigger value="notifications" aria-label="Notifications tab">Notifications</TabsTrigger>
        <TabsTrigger value="contact" aria-label="Contact tab">Contact</TabsTrigger> {/* New tab trigger */}
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
            <AdminPostTable onPostUpdated={refreshPostTable} /> 
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics" className="tw-space-y-8">
        {analyticsError ? (
          <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-8">
            <p className="tw-text-destructive tw-mb-4">Error: {analyticsError}</p>
            <Button onClick={handleRetryAnalytics} className="tw-button">Retry</Button>
          </div>
        ) : (
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
                      <span className="tw-sm tw-font-medium">Shares</span>
                      <span className="tw-sm tw-font-medium">320</span>
                    </div>
                    <div className="tw-w-full tw-bg-secondary tw-rounded-full tw-h-2">
                      <div className="tw-bg-primary tw-h-2 tw-rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </TabsContent>
      <TabsContent value="settings" className="tw-space-y-8">
        <AppSettingsForm />
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
      <TabsContent value="contact" className="tw-space-y-8"> {/* New tab content */}
        <ContactSettingsForm />
      </TabsContent>
    </Tabs>
  );
};

export default AdminDashboardTabs;
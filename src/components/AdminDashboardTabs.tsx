import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PostForm from '@/components/PostForm';
import AdminPostTable from '@/components/AdminPostTable';
import AnalyticsCard from '@/components/AnalyticsCard';
import AppSettingsForm from '@/components/AppSettingsForm';
import AdminNotificationSender from '@/components/AdminNotificationSender';
import ContactSettingsForm from '@/components/ContactSettingsForm';
import IncidentForm from '@/components/IncidentForm';
import AdminIncidentTable from '@/components/AdminIncidentTable';
import { PostService } from '@/services/PostService';
import { IncidentService } from '@/services/IncidentService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { handleError } from '@/utils/errorHandler';

interface AdminDashboardTabsProps {
  activeTab: string;
}

interface SubscriptionData {
  date: string;
  count: number;
}

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ activeTab }) => {
  const { user } = useAuth();
  const [postFormLoading, setPostFormLoading] = React.useState(false);
  const [incidentFormLoading, setIncidentFormLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const refreshPostTable = useCallback(() => {
    // This function will be passed to AdminPostTable to trigger its internal refresh
    // AdminPostTable will manage its own data fetching.
  }, []);

  const refreshIncidentTable = useCallback(() => {
    // This function will be passed to AdminIncidentTable to trigger its internal refresh
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
        refreshPostTable();
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

  const handleCreateIncident = async (type: string, location: string, description: string, imageFile: File | null, _currentImageUrl: string | undefined, latitude: number | undefined, longitude: number | undefined) => {
    if (!user) {
      toast.error('You must be logged in to create an incident.');
      return false;
    }

    setIncidentFormLoading(true);
    toast.loading('Submitting incident...', { id: 'create-incident' });

    try {
      const title = `${type} at ${location}`;
      const newIncident = await IncidentService.createIncident({
        title,
        description,
        type,
        location,
        date: new Date().toISOString(),
      }, imageFile, latitude, longitude);
      
      if (newIncident) {
        toast.success('Incident submitted successfully!', { id: 'create-incident' });
        refreshIncidentTable();
        return true;
      } else {
        handleError(null, 'Failed to submit incident.');
        return false;
      }
    } catch (err) {
      handleError(err, 'An error occurred while submitting the incident.');
      return false;
    } finally {
      setIncidentFormLoading(false);
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
    <Tabs value={activeTab} className="tw-w-full">
      <TabsList className="tw-grid tw-w-full tw-grid-cols-5">
        <TabsTrigger value="posts" aria-label="Scanner Posts tab">Scanner Posts</TabsTrigger>
        <TabsTrigger value="incidents" aria-label="Incidents tab">Incidents</TabsTrigger>
        <TabsTrigger value="analytics" aria-label="Analytics tab">Analytics</TabsTrigger>
        <TabsTrigger value="settings" aria-label="Settings tab">Settings</TabsTrigger>
        <TabsTrigger value="notifications" aria-label="Notifications tab">Notifications</TabsTrigger>
        <TabsTrigger value="contact" aria-label="Contact tab">Contact</TabsTrigger>
      </TabsList>
      <TabsContent value="posts" className="tw-space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Scanner Post</CardTitle>
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
            <CardTitle>Manage Scanner Posts</CardTitle>
            <CardDescription>View, edit, or delete existing posts</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPostTable onPostUpdated={refreshPostTable} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="incidents" className="tw-space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Submit New Incident</CardTitle>
            <CardDescription>Report a new incident for the scanner feed</CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentForm
              onSubmit={handleCreateIncident}
              isLoading={incidentFormLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manage Incidents</CardTitle>
            <CardDescription>View, edit, or delete existing incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminIncidentTable onIncidentUpdated={refreshIncidentTable} />
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
      <TabsContent value="contact" className="tw-space-y-8">
        <ContactSettingsForm />
      </TabsContent>
    </Tabs>
  );
};

export default AdminDashboardTabs;
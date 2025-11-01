"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AnalyticsCard from '@/components/AnalyticsCard';
import AppSettingsForm from '@/components/AppSettingsForm';
import AdminNotificationSender from '@/components/AdminNotificationSender';
import ContactSettingsForm from '@/components/ContactSettingsForm';
import IncidentForm from '@/components/IncidentForm';
import AdminIncidentTable from '@/components/AdminIncidentTable';
import AdminAlertTable from '@/components/AdminAlertTable';
import AdminFeedbackTable from '@/components/AdminFeedbackTable'; // Import new AdminFeedbackTable
import { IncidentService } from '@/services/IncidentService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { handleError } from '@/utils/errorHandler';
import { AnalyticsService } from '@/services/AnalyticsService';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

interface AdminDashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void; // Added onTabChange prop
}

interface SubscriptionData {
  date: string;
  count: number;
}

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient(); // Initialize queryClient
  const [incidentFormLoading, setIncidentFormLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const invalidateIncidentQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
    queryClient.invalidateQueries({ queryKey: ['incidents', 'latest'] }); // Invalidate latest incident query
    queryClient.invalidateQueries({ queryKey: ['incidents', 'archive'] }); // Invalidate archive query
    AnalyticsService.trackEvent({ name: 'admin_incident_queries_invalidated' });
  }, [queryClient]);

  const refreshAlertTable = useCallback(() => {
    // This function will be passed to AdminAlertTable to trigger its internal refresh
    AnalyticsService.trackEvent({ name: 'admin_alert_table_refresh_requested' });
  }, []);

  const handleCreateIncident = async (type: string, location: string, description: string, imageFile: File | null, _currentImageUrl: string | undefined, latitude: number | undefined, longitude: number | undefined) => {
    if (!user) {
      toast.error('You must be logged in to create an incident.');
      AnalyticsService.trackEvent({ name: 'admin_create_incident_attempt_failed', properties: { reason: 'not_logged_in' } });
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
      }, imageFile, latitude, longitude, user.id);
      
      if (newIncident) {
        toast.success('Incident submitted successfully!', { id: 'create-incident' });
        invalidateIncidentQueries(); // Invalidate queries after creation
        AnalyticsService.trackEvent({ name: 'admin_incident_created', properties: { incidentId: newIncident.id, type, location } });
        return true;
      } else {
        handleError(null, 'Failed to submit incident.');
        AnalyticsService.trackEvent({ name: 'admin_create_incident_failed', properties: { type, location } });
        return false;
      }
    } catch (err) {
      handleError(err, 'An error occurred while submitting the incident.');
      AnalyticsService.trackEvent({ name: 'admin_create_incident_error', properties: { type, location, error: (err as Error).message } });
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
        AnalyticsService.trackEvent({ name: 'fetch_subscription_data_failed', properties: { error: error.message } });
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
      AnalyticsService.trackEvent({ name: 'subscription_data_fetched', properties: { count: chartData.length } });
    } catch (error) {
      setAnalyticsError(handleError(error, 'Failed to load subscription analytics.'));
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchSubscriptionData();
      AnalyticsService.trackEvent({ name: 'admin_analytics_tab_viewed' });
    }
  }, [activeTab]);

  const handleRetryAnalytics = () => {
    fetchSubscriptionData();
    AnalyticsService.trackEvent({ name: 'admin_analytics_retry_fetch' });
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="tw-w-full">
      <div className="tw-overflow-x-auto tw-pb-2"> {/* Added scrollable container */}
        <TabsList className="tw-inline-flex tw-h-auto tw-justify-start tw-gap-2 tw-rounded-md tw-p-1"> {/* Adjusted TabsList for horizontal scroll */}
          <TabsTrigger value="incidents" aria-label="Incidents tab" className="tw-whitespace-nowrap">Incidents</TabsTrigger>
          <TabsTrigger value="alerts" aria-label="Alerts tab" className="tw-whitespace-nowrap">Alerts</TabsTrigger>
          <TabsTrigger value="feedback" aria-label="Feedback tab" className="tw-whitespace-nowrap">Feedback</TabsTrigger>
          <TabsTrigger value="analytics" aria-label="Analytics tab" className="tw-whitespace-nowrap">Analytics</TabsTrigger>
          <TabsTrigger value="settings" aria-label="Settings tab" className="tw-whitespace-nowrap">Settings</TabsTrigger>
          <TabsTrigger value="notifications" aria-label="Notifications tab" className="tw-whitespace-nowrap">Notifications</TabsTrigger>
          <TabsTrigger value="contact" aria-label="Contact tab" className="tw-whitespace-nowrap">Contact</TabsTrigger>
        </TabsList>
      </div>
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
            <AdminIncidentTable onIncidentUpdated={invalidateIncidentQueries} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="alerts" className="tw-space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Manage Real-Time Alerts</CardTitle>
            <CardDescription>View, edit, or delete real-time alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminAlertTable onAlertUpdated={refreshAlertTable} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="feedback" className="tw-space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>User Feedback & Suggestions</CardTitle>
            <CardDescription>View all submitted feedback and suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminFeedbackTable />
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
                    aria-label="Subscription growth chart"
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
                      <span className="tw-sm tw-font-medium">Likes</span>
                      <span className="tw-sm tw-font-medium">1,240</span>
                    </div>
                    <div className="tw-w-full tw-bg-secondary tw-rounded-full tw-h-2">
                      <div className="tw-bg-primary tw-h-2 tw-rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="tw-flex tw-justify-between tw-mb-1">
                      <span className="tw-sm tw-font-medium">Comments</span>
                      <span className="tw-sm tw-font-medium">856</span>
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
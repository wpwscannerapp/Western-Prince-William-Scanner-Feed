import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PostForm from '@/components/PostForm';
import AdminPostTable from '@/components/AdminPostTable';
import AnalyticsCard from '@/components/AnalyticsCard';
import AppSettingsForm from '@/components/AppSettingsForm';
import AdminNotificationSender from '@/components/AdminNotificationSender'; // Import the new component
import { PostService } from '@/services/PostService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AdminDashboardTabsProps {
  onPostTableRefresh: () => void;
}

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ onPostTableRefresh }) => {
  const { user } = useAuth();
  const [postFormLoading, setPostFormLoading] = React.useState(false);

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
      onPostTableRefresh(); // Trigger re-render of post table
      return true;
    } else {
      toast.error('Failed to create post.', { id: 'create-post' });
      return false;
    }
  };

  return (
    <Tabs defaultValue="posts" className="tw-w-full">
      <TabsList className="tw-grid tw-w-full tw-grid-cols-4 tw-mb-6"> {/* Changed to 4 columns */}
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger> {/* New tab trigger */}
      </TabsList>
      <TabsContent value="posts" className="tw-space-y-8">
        <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground">Create New Post</h2>
        <PostForm
          onSubmit={handleCreatePost}
          isLoading={postFormLoading}
        />
        <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground">Manage Posts</h2>
        <AdminPostTable onPostUpdated={onPostTableRefresh} />
      </TabsContent>
      <TabsContent value="analytics" className="tw-space-y-8">
        <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground">Analytics Overview</h2>
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
          <AnalyticsCard />
          {/* Add more analytics cards here if needed */}
        </div>
      </TabsContent>
      <TabsContent value="settings" className="tw-space-y-8">
        <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground">Application Settings</h2>
        <AppSettingsForm />
      </TabsContent>
      <TabsContent value="notifications" className="tw-space-y-8"> {/* New tab content */}
        <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground">Send Push Notifications</h2>
        <AdminNotificationSender />
      </TabsContent>
    </Tabs>
  );
};

export default AdminDashboardTabs;
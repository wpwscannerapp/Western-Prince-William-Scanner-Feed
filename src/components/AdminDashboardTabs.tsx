import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PostForm from '@/components/PostForm';
import AdminPostTable from '@/components/AdminPostTable';
import AnalyticsCard from '@/components/AnalyticsCard';
import AppSettingsForm from '@/components/AppSettingsForm';
import AdminNotificationSender from '@/components/AdminNotificationSender';
import { PostService } from '@/services/PostService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AdminDashboardTabsProps {
  onPostTableRefresh: () => void;
}

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ onPostTableRefresh }) => {
  const { user } = useAuth();
  const [postFormLoading, setPostFormLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCreatePost = async (text: string, imageFile: File | null) => {
    if (!user) {
      toast.error('You must be logged in to create a post.');
      return false;
    }

    setPostFormLoading(true);
    setError(null);
    try {
      toast.loading('Creating post...', { id: 'create-post' });
      const newPost = await PostService.createPost(text, imageFile, user.id);
      
      if (newPost) {
        toast.success('Post created successfully!', { id: 'create-post' });
        onPostTableRefresh();
        return true;
      } else {
        toast.error('Failed to create post.', { id: 'create-post' });
        return false;
      }
    } catch (err) {
      console.error('Error creating post:', err);
      toast.error('An error occurred while creating the post.', { id: 'create-post' });
      setError('Failed to create post. Please try again.');
      return false;
    } finally {
      setPostFormLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    onPostTableRefresh();
  };

  if (error) {
    return (
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-8">
        <p className="tw-text-destructive tw-mb-4">Error: {error}</p>
        <Button onClick={handleRetry}>Retry</Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="posts" className="tw-w-full">
      <TabsList className="tw-grid tw-w-full tw-grid-cols-4 tw-mb-6">
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
        </div>
      </TabsContent>
      <TabsContent value="settings" className="tw-space-y-8">
        <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground">Application Settings</h2>
        <AppSettingsForm />
      </TabsContent>
      <TabsContent value="notifications" className="tw-space-y-8">
        <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground">Send Push Notifications</h2>
        <AdminNotificationSender />
      </TabsContent>
    </Tabs>
  );
};

export default AdminDashboardTabs;
import { useState, useEffect } from 'react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PostForm from '@/components/PostForm';
import AdminPostTable from '@/components/AdminPostTable';
import AnalyticsCard from '@/components/AnalyticsCard';
import { PostService } from '@/services/PostService';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin'; // Import the new hook

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin(); // Use the new hook and destructure loading
  const navigate = useNavigate();
  const [postFormLoading, setPostFormLoading] = useState(false);
  const [postTableKey, setPostTableKey] = useState(0); // Key to force re-render of post table

  useEffect(() => {
    // Only redirect if auth is not loading, isAdmin check is not loading, and user is not admin
    if (!authLoading && !isAdminLoading && !isAdmin) {
      toast.error('Access Denied: You must be an administrator to view this page.');
      navigate('/home'); // Redirect non-admins
    }
  }, [isAdmin, isAdminLoading, authLoading, navigate]);

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
      setPostTableKey(prev => prev + 1); // Trigger re-render of post table
      return true;
    } else {
      toast.error('Failed to create post.', { id: 'create-post' });
      return false;
    }
  };

  // Show loading spinner if auth is loading OR if isAdmin status is still being determined
  if (authLoading || isAdminLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading admin panel...</p>
      </div>
    );
  }

  // If not loading and not admin, the useEffect above will handle redirection.
  // This ensures the rest of the component only renders if the user is an admin.
  if (!isAdmin) {
    return null; // Or a simple message, as redirection is handled by useEffect
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8">
      <h1 className="tw-text-3xl tw-font-bold tw-mb-6 tw-text-foreground">Admin Dashboard</h1>

      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6 tw-mb-8">
        <AnalyticsCard />
        {/* Add more analytics cards here if needed */}
      </div>

      <div className="tw-mb-8">
        <h2 className="tw-text-2xl tw-font-semibold tw-mb-4 tw-text-foreground">Create New Post</h2>
        <PostForm
          onSubmit={handleCreatePost}
          isLoading={postFormLoading}
        />
      </div>

      <div>
        <h2 className="tw-2xl tw-font-semibold tw-mb-4 tw-text-foreground">Manage Posts</h2>
        <AdminPostTable key={postTableKey} onPostUpdated={() => setPostTableKey(prev => prev + 1)} />
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default AdminPage;
import React, { useState, useEffect } from 'react';
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
  const isAdmin = useIsAdmin(); // Use the new hook
  const navigate = useNavigate();
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postFormLoading, setPostFormLoading] = useState(false);
  const [postTableKey, setPostTableKey] = useState(0); // Key to force re-render of post table

  useEffect(() => {
    if (!authLoading && !isAdmin) { // Check if not admin
      toast.error('Access Denied: You must be an administrator to view this page.');
      navigate('/home'); // Redirect non-admins
    }
  }, [isAdmin, authLoading, navigate]);

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
      setIsCreatingPost(false);
      setPostTableKey(prev => prev + 1); // Trigger re-render of post table
      return true;
    } else {
      toast.error('Failed to create post.', { id: 'create-post' });
      return false;
    }
  };

  if (authLoading || !isAdmin) { // Check if not admin or still loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pt-8">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <AnalyticsCard />
        {/* Add more analytics cards here if needed */}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Create New Post</h2>
        <PostForm
          onSubmit={handleCreatePost}
          isLoading={postFormLoading}
        />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Manage Posts</h2>
        <AdminPostTable key={postTableKey} onPostUpdated={() => setPostTableKey(prev => prev + 1)} />
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default AdminPage;
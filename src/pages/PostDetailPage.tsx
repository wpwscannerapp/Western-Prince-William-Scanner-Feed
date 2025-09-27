import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, PostService } from '@/services/PostService';
import PostCard from '@/components/PostCard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MadeWithDyad } from '@/components/made-with-dyad';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSinglePost = async () => {
      if (!postId) {
        setError('Post ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const fetchedPost = await PostService.fetchSinglePost(postId);
      if (fetchedPost) {
        setPost(fetchedPost);
      } else {
        setError('Failed to load post or post not found.');
        toast.error('Failed to load post or post not found.');
        navigate('/home'); // Redirect to home if post not found
      }
      setLoading(false);
    };

    fetchSinglePost();
  }, [postId, navigate]);

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error</h1>
          <p className="tw-text-muted-foreground">{error}</p>
          <button onClick={() => navigate('/home')} className="tw-mt-4 tw-text-primary hover:tw-underline">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return null; // Should not happen if error is handled, but as a fallback
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8 tw-max-w-2xl">
      <h1 className="tw-text-3xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Post Detail</h1>
      <PostCard post={post} />
      <MadeWithDyad />
    </div>
  );
};

export default PostDetailPage;
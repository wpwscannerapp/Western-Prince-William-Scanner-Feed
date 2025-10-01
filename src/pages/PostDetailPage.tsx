import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, PostService } from '@/services/PostService';
import PostCard from '@/components/PostCard';
import { Loader2 } from 'lucide-react';
// import { toast } from 'sonner'; // Removed unused import
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { handleError } from '@/utils/errorHandler';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSinglePost = useCallback(async () => {
    if (!postId) {
      setError('Post ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedPost = await PostService.fetchSinglePost(postId);
      if (fetchedPost) {
        setPost(fetchedPost);
      } else {
        setError(handleError(null, 'Failed to load post or post not found.'));
      }
    } catch (err) {
      setError(handleError(err, 'An unexpected error occurred while loading the post.'));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchSinglePost();
  }, [fetchSinglePost]);

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading post...</p>
      </div>
    );
  }

  if (!post && !loading && !error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-foreground tw-mb-4">Post Not Found</h1>
          <p className="tw-text-muted-foreground">The post you are looking for does not exist or has been removed.</p>
          <Button onClick={() => navigate('/home')} className="tw-mt-4">Go to Home</Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error</h1>
          <p className="tw-text-muted-foreground">{error}</p>
          <div className="tw-flex tw-justify-center tw-gap-2 tw-mt-4">
            <Button onClick={fetchSinglePost}>Retry</Button>
            <Button onClick={() => navigate('/home')} variant="outline">Go to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
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
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, PostService } from '@/services/PostService';
import PostCard from '@/components/PostCard';
import { Loader2 } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { handleError } from '@/utils/errorHandler';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]); // State for related posts

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

  // Hypothetical fetch for related posts
  const fetchRelatedPosts = useCallback(async () => {
    // In a real application, this would fetch posts related by tags, keywords, etc.
    // For now, we'll simulate by fetching a few recent posts excluding the current one.
    try {
      const allPosts = await PostService.fetchPosts(0); // Fetch some posts
      const filteredRelated = allPosts
        .filter(p => p.id !== postId)
        .slice(0, 2); // Get up to 2 related posts
      setRelatedPosts(filteredRelated);
    } catch (err) {
      handleError(err, 'Failed to load related posts.');
      setRelatedPosts([]);
    }
  }, [postId]);

  useEffect(() => {
    fetchSinglePost();
    fetchRelatedPosts(); // Fetch related posts when component mounts or postId changes
  }, [fetchSinglePost, fetchRelatedPosts]);

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
          <Button onClick={() => navigate('/home')} className="tw-mt-4 tw-button">Go to Home</Button>
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
            <Button onClick={fetchSinglePost} className="tw-button">Retry</Button>
            <Button onClick={() => navigate('/home')} variant="outline" className="tw-button">Go to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8 tw-max-w-3xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Feed
      </Button>
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Post Detail</h1>
      <div className="tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-md" aria-labelledby={`post-title-${post.id}`}>
        <PostCard post={post} />
      </div>

      {/* Related Posts Section */}
      {relatedPosts.length > 0 && (
        <div className="tw-mt-8">
          <h2 className="tw-text-2xl tw-font-semibold tw-mb-4 tw-text-foreground">Related Posts</h2>
          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
            {relatedPosts.map(relatedPost => (
              <PostCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </div>
      )}

      <MadeWithDyad />
    </div>
  );
};

export default PostDetailPage;
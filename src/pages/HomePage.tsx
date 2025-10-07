import { useEffect, useState, useCallback, useRef } from 'react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import PostCard from '@/components/PostCard';
import SubscribeOverlay from '@/components/SubscribeOverlay';
import NotificationBell from '@/components/NotificationBell';
import PostForm from '@/components/PostForm';
import { Post, PostService } from '@/services/PostService';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowUp, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { handleError } from '@/utils/errorHandler';
import { POLL_INTERVAL } from '@/config';
import SkeletonLoader from '@/components/SkeletonLoader';

const HomePage = () => {
  const { user } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const { isSubscribed, loading: isSubscribedLoading } = useIsSubscribed();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [postFormLoading, setPostFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastPostRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading || !hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMore) {
            setTimeout(() => setPage(prev => prev + 1), 300);
          }
        },
        { threshold: 0.1 }
      );
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    const fetchInitialPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const initialPosts = await PostService.fetchPosts(0);
        setPosts(initialPosts);
        setHasMore(initialPosts.length === PostService.POSTS_PER_PAGE);
      } catch (err) {
        setError(handleError(err, 'Failed to load posts. Please try again.'));
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPosts();
  }, []);

  useEffect(() => {
    const fetchMorePosts = async () => {
      if (page === 0) return;
      setLoading(true);
      setError(null);
      try {
        const newPosts = await PostService.fetchPosts(page);
        if (newPosts.length === 0) {
          setHasMore(false);
        } else {
          setPosts(prevPosts => [...prevPosts, ...newPosts]);
        }
      } catch (err) {
        setError(handleError(err, 'Failed to load more posts. Please try again.'));
      } finally {
        setLoading(false);
      }
    };

    if (page > 0) {
      fetchMorePosts();
    }
  }, [page]);

  const fetchNewPosts = useCallback(async () => {
    if (posts.length === 0) return;
    try {
      const latestTimestamp = posts[0].timestamp;
      const newFetchedPosts = await PostService.fetchNewPosts(latestTimestamp);
      if (newFetchedPosts.length > 0) {
        setPosts(prevPosts => {
          const uniqueNewPosts = newFetchedPosts.filter(
            newPost => !prevPosts.some(existingPost => existingPost.id === newPost.id)
          );
          if (uniqueNewPosts.length > 0) {
            setNewPostsAvailable(true);
            return [...uniqueNewPosts, ...prevPosts];
          }
          return prevPosts;
        });
      }
    } catch (err) {
      handleError(err, 'Failed to fetch new posts.');
    }
  }, [posts]);

  useEffect(() => {
    const pollInterval = POLL_INTERVAL;
    const interval = setInterval(() => {
      if (isSubscribed || isAdmin) {
        fetchNewPosts();
      }
    }, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNewPosts, isSubscribed, isAdmin]);

  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        setPosts(prevPosts => {
          if (prevPosts.some(p => p.id === newPost.id)) return prevPosts;
          setNewPostsAvailable(true);
          return [newPost, ...prevPosts];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNewPostsAvailable(false);
  };

  const handleCreatePost = async (text: string, imageFile: File | null) => {
    if (!user) {
      toast.error('You must be logged in to create a post.');
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
    } catch (err) {
      handleError(err, 'An error occurred while creating the post.');
      return false;
    } finally {
      setPostFormLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setPage(0);
    setPosts([]);
    setHasMore(true);
  };

  if (isAdminLoading || isSubscribedLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-container tw-mx-auto tw-p-4 tw-pt-24 tw-relative tw-max-w-xl">
        <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
          <h1 className="tw-text-3xl tw-font-bold tw-text-foreground">Home Feed</h1>
          <NotificationBell />
        </div>
        
        <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12">
          <p className="tw-text-destructive tw-mb-4">Error: {error}</p>
          <Button onClick={handleRetry}>Retry</Button>
        </div>
        
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-24 tw-relative tw-max-w-xl">
      <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <h1 className="tw-text-3xl tw-font-bold tw-text-foreground">Home Feed</h1>
        <NotificationBell aria-label="Toggle notifications" />
      </div>

      <p className="tw-text-center tw-text-muted-foreground tw-mb-8">
        Welcome to your WPW Scanner Feed!
      </p>

      {isAdmin && (
        <div className="tw-bg-background tw-p-4 tw-shadow-md tw-mb-8 tw-rounded-lg"> {/* Removed tw-sticky, tw-top-20, tw-z-10 */}
          <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground tw-mb-4">Create New Post</h2>
          <PostForm
            onSubmit={handleCreatePost}
            isLoading={postFormLoading}
          />
        </div>
      )}

      <div className={`tw-space-y-6 ${!isSubscribed && !isAdmin ? 'tw-relative' : ''}`} aria-live="polite">
        <div className={!isSubscribed && !isAdmin ? 'tw-blur-sm tw-pointer-events-none' : ''}>
          {posts.length === 0 && !loading && (
            <div className="tw-text-center tw-py-12 tw-col-span-full">
              <MessageCircle className="tw-h-12 tw-w-12 tw-text-muted-foreground tw-mx-auto tw-mb-4" aria-hidden="true" />
              <p className="tw-text-muted-foreground tw-mb-4 tw-text-lg">No posts available yet. Check back soon!</p>
              {isAdmin && (
                <Button onClick={handleRetry} variant="outline">
                  Refresh
                </Button>
              )}
            </div>
          )}
          
          {loading && posts.length === 0 && (
            <SkeletonLoader count={3} className="tw-col-span-full" />
          )}

          {posts.map((post, index) => (
            <div key={post.id} ref={index === posts.length - 1 ? lastPostRef : null} className="tw-transition tw-duration-300 hover:tw-shadow-lg">
              <PostCard post={post} />
            </div>
          ))}
          
          {loading && posts.length > 0 && (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-8 tw-gap-2 tw-text-muted-foreground tw-col-span-full">
              <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
              <span>Loading more posts...</span>
            </div>
          )}
          
          {!hasMore && !loading && posts.length > 0 && (
            <p className="tw-text-center tw-text-muted-foreground tw-py-4 tw-col-span-full">You've reached the end of the feed.</p>
          )}
        </div>
        {!isSubscribed && !isAdmin && <SubscribeOverlay />}
      </div>

      {newPostsAvailable && (
        <Button
          onClick={scrollToTop}
          className="tw-fixed tw-bottom-6 tw-right-6 tw-rounded-full tw-shadow-lg tw-p-3 tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-animate-bounce"
          size="icon"
          aria-label="Scroll to new posts"
        >
          <ArrowUp className="tw-h-5 tw-w-5" />
          <span className="tw-sr-only">Scroll to new posts</span>
        </Button>
      )}

      <MadeWithDyad />
    </div>
  );
};

export default HomePage;
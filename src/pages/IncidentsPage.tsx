import React, { useEffect, useState, useCallback, useRef } from 'react';
import PostCard from '@/components/PostCard';
import SubscribeOverlay from '@/components/SubscribeOverlay';
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
// Removed unused import: import SkeletonLoader from '@/components/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query'; // Import InfiniteData

const IncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const { isSubscribed, loading: isSubscribedLoading } = useIsSubscribed();
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [postFormLoading, setPostFormLoading] = useState(false);
  const queryClient = useQueryClient(); // Initialize queryClient
  const observer = useRef<IntersectionObserver | null>(null);
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch, // Add refetch from useInfiniteQuery
  } = useInfiniteQuery<Post[], Error>({
    queryKey: ['posts'],
    queryFn: async ({ pageParam = 0 }) => {
      // Cast pageParam to number
      const fetchedPosts = await PostService.fetchPosts(pageParam as number, PostService.POSTS_PER_PAGE);
      return fetchedPosts;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PostService.POSTS_PER_PAGE) {
        return undefined; // No more pages
      }
      return allPages.flat().length; // Offset for the next page
    },
    staleTime: 1000 * 60, // Cache for 1 minute
    initialPageParam: 0,
  });

  const posts = data?.pages.flat() || [];

  const lastPostRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage || !hasNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        // Type oldData as InfiniteData<Post[]>
        queryClient.setQueryData<InfiniteData<Post[]>>(['posts'], (oldData) => {
          if (!oldData) return { pages: [[newPost]], pageParams: [0] };
          const firstPage = oldData.pages[0];
          if (firstPage.some((p: Post) => p.id === newPost.id)) return oldData; // Prevent duplicates
          setNewPostsAvailable(true);
          return {
            ...oldData,
            pages: [[newPost, ...firstPage], ...oldData.pages.slice(1)],
          };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
        queryClient.invalidateQueries({ queryKey: ['posts'] }); // Invalidate to refetch and show new post
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
    refetch(); // Refetch all pages on retry
  };

  if (isAdminLoading || isSubscribedLoading || isLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading incidents...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12">
        <p className="tw-text-destructive tw-mb-4">Error: {error?.message || 'An unexpected error occurred.'}</p>
        <Button onClick={handleRetry}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Incidents Feed</h1>
      <p className="tw-text-center tw-text-muted-foreground tw-mb-8">
        Real-time scanner updates for Western Prince William.
      </p>

      {isAdmin && (
        <div className="tw-bg-background tw-p-4 tw-shadow-md tw-mb-8 tw-rounded-lg">
          <h2 className="tw-text-2xl tw-font-semibold tw-text-foreground tw-mb-4">Create New Post</h2>
          <PostForm
            onSubmit={handleCreatePost}
            isLoading={postFormLoading}
          />
        </div>
      )}

      <div className={`tw-space-y-6 ${!isSubscribed && !isAdmin ? 'tw-relative' : ''}`} aria-live="polite">
        <div className={!isSubscribed && !isAdmin ? 'tw-blur-sm tw-pointer-events-none' : ''}>
          {posts.length === 0 && !isLoading && (
            <div className="tw-text-center tw-py-12 tw-col-span-full">
              <MessageCircle className="tw-h-12 tw-w-12 tw-text-muted-foreground tw-mx-auto tw-mb-4" aria-hidden="true" />
              <p className="tw-text-muted-foreground tw-mb-4 tw-text-lg">No incidents available yet. Check back soon!</p>
              {isAdmin && (
                <Button onClick={handleRetry} variant="outline">
                  Refresh
                </Button>
              )}
            </div>
          )}
          
          {posts.map((post, index) => (
            <div key={post.id} ref={index === posts.length - 1 ? lastPostRef : null} className="tw-transition tw-duration-300 hover:tw-shadow-lg">
              <PostCard post={post} />
            </div>
          ))}
          
          {isFetchingNextPage && (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-8 tw-gap-2 tw-text-muted-foreground tw-col-span-full">
              <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
              <span>Loading more incidents...</span>
            </div>
          )}
          
          {!hasNextPage && !isLoading && posts.length > 0 && (
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
    </div>
  );
};

export default IncidentsPage;
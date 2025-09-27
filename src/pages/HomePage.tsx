import { useEffect, useState, useCallback, useRef } from 'react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import PostCard from '@/components/PostCard';
import SubscribeOverlay from '@/components/SubscribeOverlay';
import NotificationBell from '@/components/NotificationBell';
import { Post, PostService } from '@/services/PostService';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button'; // Import Button for the new posts indicator

const HomePage = () => {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false); // New state for new posts indicator
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (isAdmin.isAdmin) { // Use isAdmin.isAdmin
        setIsSubscribed(true);
        return;
      }

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile for subscription status:', error);
          setIsSubscribed(false);
        } else if (profile) {
          setIsSubscribed(profile.subscription_status === 'trialing' || profile.subscription_status === 'active');
        } else {
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
    };
    checkSubscriptionStatus();
  }, [user, isAdmin.isAdmin]); // Depend on isAdmin.isAdmin

  const fetchPosts = useCallback(async (pageNum: number, append: boolean = true) => {
    setLoading(true);
    const newPosts = await PostService.fetchPosts(pageNum);
    if (newPosts.length === 0) {
      setHasMore(false);
    } else {
      setPosts(prevPosts => (append ? [...prevPosts, ...newPosts] : newPosts));
    }
    setLoading(false);
  }, []);

  const fetchNewPosts = useCallback(async () => {
    if (posts.length === 0) return;
    const latestTimestamp = posts[0].timestamp;
    const newFetchedPosts = await PostService.fetchNewPosts(latestTimestamp);
    if (newFetchedPosts.length > 0) {
      setPosts(prevPosts => [...newFetchedPosts, ...prevPosts]);
      setNewPostsAvailable(true); // Set indicator when new posts arrive
      // No toast here, the indicator handles it
    }
  }, [posts]);

  useEffect(() => {
    fetchPosts(0, false);
  }, [fetchPosts]);

  useEffect(() => {
    if (page > 0) {
      fetchPosts(page);
    }
  }, [page, fetchPosts]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isSubscribed || isAdmin.isAdmin) { // Use isAdmin.isAdmin
        fetchNewPosts();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNewPosts, isSubscribed, isAdmin.isAdmin]); // Depend on isAdmin.isAdmin

  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        setPosts(prevPosts => [newPost, ...prevPosts]);
        setNewPostsAvailable(true); // Set indicator when new posts arrive via real-time
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Removed isSubscribed and isAdmin.isAdmin from dependencies as the channel should always listen

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNewPostsAvailable(false); // Reset indicator after scrolling to top
  };

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8 tw-relative tw-max-w-2xl"> {/* Constrain width for better readability */}
      <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <h1 className="tw-text-3xl tw-font-bold tw-text-foreground">Home Feed</h1>
        <NotificationBell />
      </div>

      <p className="tw-text-center tw-text-muted-foreground tw-mb-8">
        Welcome to your WPW Scanner Feed!
      </p>

      <div className={`tw-space-y-6 ${!isSubscribed && !isAdmin.isAdmin ? 'tw-relative' : ''}`}>
        <div className={!isSubscribed && !isAdmin.isAdmin ? 'tw-blur-sm tw-pointer-events-none' : ''}>
          {posts.length === 0 && !loading && (
            <p className="tw-text-center tw-text-muted-foreground tw-py-8">No posts available yet. Check back soon!</p>
          )}
          {posts.map((post, index) => (
            <div key={post.id} ref={index === posts.length - 1 ? lastPostRef : null}>
              <PostCard post={post} />
            </div>
          ))}
          {loading && (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-8 tw-gap-2 tw-text-muted-foreground">
              <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
              <span>Loading more posts...</span>
            </div>
          )}
          {!hasMore && !loading && posts.length > 0 && (
            <p className="tw-text-center tw-text-muted-foreground tw-py-4">You've reached the end of the feed.</p>
          )}
        </div>
        {!isSubscribed && !isAdmin.isAdmin && <SubscribeOverlay />}
      </div>

      {newPostsAvailable && (
        <Button
          onClick={scrollToTop}
          className="tw-fixed tw-bottom-6 tw-right-6 tw-rounded-full tw-shadow-lg tw-p-3 tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-animate-bounce"
          size="icon"
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
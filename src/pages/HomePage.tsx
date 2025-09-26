import { useEffect, useState, useCallback, useRef } from 'react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import PostCard from '@/components/PostCard';
import SubscribeOverlay from '@/components/SubscribeOverlay';
import NotificationBell from '@/components/NotificationBell';
import { Post, PostService } from '@/services/PostService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const HomePage = () => {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
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
      if (isAdmin) {
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
  }, [user, isAdmin]);

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
    const newPosts = await PostService.fetchNewPosts(latestTimestamp);
    if (newPosts.length > 0) {
      setPosts(prevPosts => [...newPosts, ...prevPosts]);
      toast.info(`${newPosts.length} new scanner updates!`);
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
      if (isSubscribed || isAdmin) {
        fetchNewPosts();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNewPosts, isSubscribed, isAdmin]);

  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        setPosts(prevPosts => [newPost, ...prevPosts]);
        if (isSubscribed || isAdmin) {
          toast.info('New scanner update received!');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSubscribed, isAdmin]);

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8 tw-relative">
      <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <h1 className="tw-text-3xl tw-font-bold tw-text-foreground">Home Feed</h1>
        <NotificationBell />
      </div>

      <p className="tw-text-center tw-text-muted-foreground tw-mb-8">
        Welcome to your WPW Scanner Feed!
      </p>

      <div className={`tw-space-y-6 ${!isSubscribed && !isAdmin ? 'tw-relative' : ''}`}>
        <div className={!isSubscribed && !isAdmin ? 'tw-blur-sm tw-pointer-events-none' : ''}>
          {posts.map((post, index) => (
            <div key={post.id} ref={index === posts.length - 1 ? lastPostRef : null}>
              <PostCard post={post} />
            </div>
          ))}
          {loading && (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-4">
              <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
            </div>
          )}
          {!hasMore && !loading && posts.length > 0 && (
            <p className="tw-text-center tw-text-muted-foreground tw-py-4">You've reached the end of the feed.</p>
          )}
        </div>
        {!isSubscribed && !isAdmin && <SubscribeOverlay />}
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default HomePage;
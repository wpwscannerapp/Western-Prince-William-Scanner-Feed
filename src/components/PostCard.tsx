import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Loader2 } from 'lucide-react';
import { Post, PostService } from '@/services/PostService';
import PostHeader from './PostHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = React.memo(({ post }) => {
  const { user } = useAuth();
  const isAdminPost = !!post.admin_id;
  const navigate = useNavigate(); // Initialize useNavigate

  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0); // New state for comments count
  const [error, setError] = useState<string | null>(null);

  const fetchLikesAndCommentsCount = async () => {
    try {
      const [likes, likedStatus, comments] = await Promise.all([
        PostService.fetchLikesCount(post.id),
        user ? PostService.hasUserLiked(post.id, user.id) : Promise.resolve(false),
        PostService.fetchComments(post.id), // Fetch comments to get count
      ]);

      setLikesCount(likes);
      setHasLiked(likedStatus);
      setCommentsCount(comments.length); // Set comments count
    } catch (err) {
      setError(handleError(err, 'Failed to load post data. Please try again.'));
    }
  };

  useEffect(() => {
    fetchLikesAndCommentsCount();

    const likesChannel = supabase
      .channel(`public:likes:post_id=eq.${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` }, () => {
        // When a real-time update comes, re-fetch to ensure consistency
        PostService.fetchLikesCount(post.id).then(setLikesCount);
        if (user) {
          PostService.hasUserLiked(post.id, user.id).then(setHasLiked);
        }
      })
      .subscribe();

    const commentsChannel = supabase
      .channel(`public:comments:post_id=eq.${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, () => {
        PostService.fetchComments(post.id).then(fetchedComments => setCommentsCount(fetchedComments.length));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [post.id, user]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to post detail when liking
    if (!user) {
      handleError(null, 'You must be logged in to like a post.');
      return;
    }
    setIsLiking(true);

    // Optimistic UI update
    const previousHasLiked = hasLiked;
    const previousLikesCount = likesCount;
    setHasLiked(!previousHasLiked);
    setLikesCount(prev => (previousHasLiked ? prev - 1 : prev + 1));

    try {
      let success: boolean;
      if (previousHasLiked) {
        success = await PostService.removeLike(post.id, user.id);
      } else {
        success = await PostService.addLike(post.id, user.id);
      }

      if (!success) {
        // Revert UI if API call fails
        setHasLiked(previousHasLiked);
        setLikesCount(previousLikesCount);
        handleError(null, `Failed to ${previousHasLiked ? 'unlike' : 'like'} post.`);
      }
    } catch (err) {
      // Revert UI on unexpected error
      setHasLiked(previousHasLiked);
      setLikesCount(previousLikesCount);
      handleError(err, 'An error occurred while liking the post.');
    } finally {
      setIsLiking(false);
    }
  };

  const handlePostClick = () => {
    navigate(`/posts/${post.id}`);
  };

  if (error) {
    return (
      <Card className="tw-w-full tw-bg-card tw-border tw-border-border tw-shadow-md tw-text-foreground tw-rounded-lg">
        <CardContent className="tw-pt-4 tw-px-4 tw-pb-4">
          <p className="tw-text-destructive">Error: {error}</p>
          <Button onClick={() => setError(null)} variant="outline" className="tw-mt-2 tw-button">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tw-w-full tw-bg-card tw-border tw-border-border tw-shadow-md tw-text-foreground tw-rounded-lg tw-cursor-pointer" onClick={handlePostClick}>
      <div className="tw-p-4 tw-pb-2">
        <PostHeader timestamp={post.timestamp} isAdminPost={isAdminPost} />
      </div>
      <CardContent className="tw-pt-2 tw-px-4 tw-pb-4">
        <p className="tw-text-base tw-mb-3 tw-whitespace-pre-wrap tw-leading-relaxed">{post.text}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="tw-w-full tw-max-h-80 tw-object-cover tw-rounded-md tw-mb-4 tw-border tw-border-border"
            loading="lazy" // Lazy-load images
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              setError(handleError(null, 'Failed to load image.'));
            }}
          />
        )}
      </CardContent>
      <CardFooter className="tw-flex tw-flex-col tw-items-start tw-pt-0 tw-pb-4 tw-px-4">
        <div className="tw-flex tw-justify-between tw-w-full tw-mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLikeToggle}
            disabled={isLiking || !user}
            className={hasLiked ? 'tw-text-primary hover:tw-text-primary/80 tw-button' : 'tw-text-muted-foreground hover:tw-text-primary tw-button'}
          >
            {isLiking ? <Loader2 className="tw-h-4 tw-w-4 tw-mr-1 tw-animate-spin" /> : <Heart className="tw-h-4 tw-w-4 tw-mr-1" fill={hasLiked ? 'currentColor' : 'none'} />}
            {likesCount} Like{likesCount !== 1 ? 's' : ''}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePostClick} // Clicking comment button also navigates to detail page
            className="tw-text-muted-foreground hover:tw-text-primary tw-button"
          >
            <MessageCircle className="tw-h-4 tw-w-4 tw-mr-1" /> {commentsCount} Comment{commentsCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

export default PostCard;
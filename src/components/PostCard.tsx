import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Loader2 } from 'lucide-react';
import { Post, Comment, PostService } from '@/services/PostService';
import PostHeader from './PostHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import CommentCard from './CommentCard'; // Import the new CommentCard

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuth();
  const isAdminPost = !!post.admin_id;

  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const fetchLikesAndComments = async () => {
    if (!user) return;

    const [likes, likedStatus, fetchedComments] = await Promise.all([
      PostService.fetchLikesCount(post.id),
      PostService.hasUserLiked(post.id, user.id),
      PostService.fetchComments(post.id),
    ]);

    setLikesCount(likes);
    setHasLiked(likedStatus);
    setComments(fetchedComments);
  };

  useEffect(() => {
    fetchLikesAndComments();

    // Realtime subscription for likes
    const likesChannel = supabase
      .channel(`public:likes:post_id=eq.${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` }, () => {
        PostService.fetchLikesCount(post.id).then(setLikesCount);
        if (user) {
          PostService.hasUserLiked(post.id, user.id).then(setHasLiked);
        }
      })
      .subscribe();

    // Realtime subscription for comments
    const commentsChannel = supabase
      .channel(`public:comments:post_id=eq.${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, () => {
        PostService.fetchComments(post.id).then(setComments);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [post.id, user]);

  const handleLikeToggle = async () => {
    if (!user) {
      toast.error('You must be logged in to like a post.');
      return;
    }
    setIsLiking(true);
    if (hasLiked) {
      const success = await PostService.removeLike(post.id, user.id);
      if (success) {
        setHasLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        toast.error('Failed to unlike post.');
      }
    } else {
      const success = await PostService.addLike(post.id, user.id);
      if (success) {
        setHasLiked(true);
        setLikesCount(prev => prev + 1);
      } else {
        toast.error('Failed to like post.');
      }
    }
    setIsLiking(false);
  };

  const handleAddComment = async () => {
    if (!user) {
      toast.error('You must be logged in to comment.');
      return;
    }
    if (newCommentContent.trim() === '') {
      toast.error('Comment cannot be empty.');
      return;
    }

    setIsCommenting(true);
    toast.loading('Adding comment...', { id: 'add-comment' });
    const newComment = await PostService.addComment(post.id, user.id, newCommentContent);
    setIsCommenting(false);

    if (newComment) {
      toast.success('Comment added!', { id: 'add-comment' });
      setComments(prev => [...prev, newComment]);
      setNewCommentContent('');
    } else {
      toast.error('Failed to add comment.', { id: 'add-comment' });
    }
  };

  const handleCommentUpdated = (updatedComment: Comment) => {
    setComments(prev => prev.map(c => (c.id === updatedComment.id ? updatedComment : c)));
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { // Submit on Enter, allow Shift+Enter for new line if it were a textarea
      event.preventDefault();
      handleAddComment();
    }
  };

  return (
    <Card className="tw-w-full tw-bg-card tw-border tw-border-border tw-shadow-md tw-text-foreground tw-rounded-lg">
      <div className="tw-p-4 tw-pb-2">
        <PostHeader timestamp={post.timestamp} isAdminPost={isAdminPost} />
      </div>
      <CardContent className="tw-pt-2 tw-px-4 tw-pb-4">
        <p className="tw-text-base tw-mb-4 tw-whitespace-pre-wrap">{post.text}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="tw-w-full tw-max-h-80 tw-object-cover tw-rounded-md tw-mb-4 tw-border tw-border-border"
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
            className={hasLiked ? 'tw-text-primary hover:tw-text-primary/80' : 'tw-text-muted-foreground hover:tw-text-primary'}
          >
            {isLiking ? <Loader2 className="tw-h-4 tw-w-4 tw-mr-1 tw-animate-spin" /> : <Heart className="tw-h-4 tw-w-4 tw-mr-1" fill={hasLiked ? 'currentColor' : 'none'} />}
            {likesCount} Like{likesCount !== 1 ? 's' : ''}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(prev => !prev)}
            className="tw-text-muted-foreground hover:tw-text-primary"
          >
            <MessageCircle className="tw-h-4 tw-w-4 tw-mr-1" /> {comments.length} Comment{comments.length !== 1 ? 's' : ''}
          </Button>
        </div>

        {showComments && (
          <div className="tw-w-full tw-space-y-4 tw-mt-4">
            <div className="tw-flex tw-gap-2">
              <Input
                placeholder="Add a comment..."
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isCommenting || !user}
                className="tw-flex-1"
              />
              <Button onClick={handleAddComment} disabled={isCommenting || !user}>
                {isCommenting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
                Comment
              </Button>
            </div>
            <div className="tw-space-y-3">
              {comments.length === 0 ? (
                <p className="tw-text-sm tw-text-muted-foreground tw-text-center">No comments yet. Be the first!</p>
              ) : (
                comments.map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onCommentUpdated={handleCommentUpdated}
                    onCommentDeleted={handleCommentDeleted}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PostCard;
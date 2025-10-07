import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, Comment, PostService } from '@/services/PostService';
import PostCard from '@/components/PostCard';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleError } from '@/utils/errorHandler';
import { Input } from '@/components/ui/input';
import CommentCard from '@/components/CommentCard';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousPost, setPreviousPost] = useState<Post | null>(null); // Changed from relatedPosts
  
  // Comment states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

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
        // Fetch previous post after the current post is loaded
        const fetchedPreviousPost = await PostService.fetchPreviousPost(fetchedPost.timestamp);
        setPreviousPost(fetchedPreviousPost);
      } else {
        setError(handleError(null, 'Failed to load post or post not found.'));
      }
    } catch (err) {
      setError(handleError(err, 'An unexpected error occurred while loading the post.'));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchCommentsForPost = useCallback(async () => {
    if (!postId) return;
    setLoadingComments(true);
    try {
      const fetchedComments = await PostService.fetchComments(postId);
      setComments(fetchedComments);
    } catch (err) {
      setError(handleError(err, 'Failed to load comments. Please try again.'));
    } finally {
      setLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchSinglePost();
    fetchCommentsForPost(); // Fetch comments when the page loads

    // Set up real-time subscription for comments
    const commentsChannel = supabase
      .channel(`public:comments:post_id=eq.${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => {
        fetchCommentsForPost(); // Re-fetch comments on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [fetchSinglePost, fetchCommentsForPost, postId]);

  const handleAddComment = async () => {
    if (!user) {
      handleError(null, 'You must be logged in to comment.');
      return;
    }
    if (newCommentContent.trim() === '') {
      handleError(null, 'Comment cannot be empty.');
      return;
    }
    if (!postId) {
      handleError(null, 'Post ID is missing for commenting.');
      return;
    }

    setIsCommenting(true);
    try {
      toast.loading('Adding comment...', { id: 'add-comment' });
      const newComment = await PostService.addComment(postId, user.id, newCommentContent);
      
      if (newComment) {
        toast.success('Comment added!', { id: 'add-comment' });
        setNewCommentContent('');
        // Comments will be re-fetched by the real-time subscription
      } else {
        handleError(null, 'Failed to add comment.', { id: 'add-comment' });
      }
    } catch (err) {
      handleError(err, 'An error occurred while adding the comment.', { id: 'add-comment' });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleCommentUpdated = (updatedComment: Comment) => {
    setComments(prev => prev.map(c => (c.id === updatedComment.id ? updatedComment : c)));
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAddComment();
    }
  };

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
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-24 tw-max-w-3xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Feed
      </Button>
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Post Detail</h1>
      <div className="tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-md" aria-labelledby={`post-title-${post.id}`}>
        {/* PostCard is now just for display, not interaction */}
        <PostCard post={post} /> 
      </div>

      {/* Comments Section */}
      <div className="tw-mt-8 tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-md">
        <h2 className="tw-text-2xl tw-font-semibold tw-mb-4 tw-text-foreground tw-flex tw-items-center tw-gap-2">
          <MessageCircle className="tw-h-6 tw-w-6" /> Comments ({comments.length})
        </h2>
        <div className="tw-flex tw-gap-2 tw-mb-6">
          <Input
            placeholder="Add a comment..."
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isCommenting || !user}
            className="tw-flex-1 tw-input"
          />
          <Button onClick={handleAddComment} disabled={isCommenting || !user} className="tw-button">
            {isCommenting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            Comment
          </Button>
        </div>

        {loadingComments ? (
          <div className="tw-flex tw-justify-center tw-py-4">
            <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
            <span className="tw-ml-2 tw-text-muted-foreground">Loading comments...</span>
          </div>
        ) : (
          <div className="tw-space-y-4">
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
        )}
      </div>

      {/* Previous Post Section */}
      {previousPost && (
        <div className="tw-mt-8">
          <h2 className="tw-text-2xl tw-font-semibold tw-mb-4 tw-text-foreground">Previous Post</h2>
          <div className="tw-grid tw-grid-cols-1"> {/* Changed to single column for one post */}
            <PostCard post={previousPost} />
          </div>
        </div>
      )}

      <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
    </div>
  );
};

export default PostDetailPage;
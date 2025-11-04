"use client";

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Edit, Trash2, Save, X, MessageSquare } from 'lucide-react';
import { CommentWithProfile } from '@/types/supabase'; // Import CommentWithProfile
import { CommentService } from '@/services/CommentService';
import { useAuth } from '@/hooks/useAuth';
import { formatPostTimestamp } from '@/lib/utils';
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService';
import ReplyForm from './ReplyForm'; // Import ReplyForm

interface CommentCardProps {
  comment: CommentWithProfile; // Use CommentWithProfile type
  onCommentUpdated: (updatedComment: CommentWithProfile) => void;
  onCommentDeleted: (commentId: string) => void;
  incidentId: string; // Added incidentId prop
  onReplySubmitted: () => void; // Added onReplySubmitted prop
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, onCommentUpdated, onCommentDeleted, incidentId, onReplySubmitted }) => {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user_id;
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async () => {
    if (editedContent.trim() === '') {
      toast.error('Comment cannot be empty.');
      AnalyticsService.trackEvent({ name: 'edit_comment_failed', properties: { commentId: comment.id, reason: 'empty_content' } });
      return;
    }
    setIsLoading(true);
    try {
      toast.loading('Updating comment...', { id: 'update-comment' });
      const updatedComment = await CommentService.updateComment(comment.id, editedContent);
      
      if (updatedComment) {
        toast.success('Comment updated!', { id: 'update-comment' });
        onCommentUpdated(updatedComment);
        setIsEditing(false);
        AnalyticsService.trackEvent({ name: 'comment_edited', properties: { commentId: comment.id, userId: user?.id } });
      } else {
        toast.error('Failed to update comment.', { id: 'update-comment' });
        AnalyticsService.trackEvent({ name: 'edit_comment_failed', properties: { commentId: comment.id, userId: user?.id, reason: 'db_update_failed' } });
      }
    } catch (err) {
      toast.error('An error occurred while updating the comment.', { id: 'update-comment' });
      AnalyticsService.trackEvent({ name: 'edit_comment_failed', properties: { commentId: comment.id, userId: user?.id, reason: 'unexpected_error', error: (err as Error).message } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment and all its replies?')) {
      setIsLoading(true);
      try {
        toast.loading('Deleting comment...', { id: 'delete-comment' });
        const success = await CommentService.deleteComment(comment.id);
        
        if (success) {
          toast.success('Comment deleted!', { id: 'delete-comment' });
          onCommentDeleted(comment.id);
          AnalyticsService.trackEvent({ name: 'comment_deleted', properties: { commentId: comment.id, userId: user?.id } });
        } else {
          toast.error('Failed to delete comment.', { id: 'delete-comment' });
          AnalyticsService.trackEvent({ name: 'delete_comment_failed', properties: { commentId: comment.id, userId: user?.id, reason: 'db_delete_failed' } });
        }
      } catch (err) {
        toast.error('An error occurred while deleting the comment.', { id: 'delete-comment' });
        AnalyticsService.trackEvent({ name: 'delete_comment_failed', properties: { commentId: comment.id, userId: user?.id, reason: 'unexpected_error', error: (err as Error).message } });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(comment.content);
    setIsEditing(false);
    setError(null);
    AnalyticsService.trackEvent({ name: 'edit_comment_cancelled', properties: { commentId: comment.id, userId: user?.id } });
  };

  const displayName = comment.profiles?.username || 'Anonymous';
  const displayAvatar = comment.profiles?.avatar_url || undefined;
  const avatarFallback = displayName.charAt(0).toUpperCase();

  if (error) {
    return (
      <div className="tw-flex tw-gap-3 tw-p-4 tw-bg-destructive/10 tw-rounded-lg tw-border tw-border-destructive">
        <div className="tw-flex-1">
          <p className="tw-text-destructive">Error: {error}</p>
          <Button onClick={() => setError(null)} variant="outline" size="sm" className="tw-mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-space-y-4">
      <div className="tw-flex tw-gap-3 tw-p-4 tw-bg-background tw-rounded-lg tw-border tw-border-border" aria-label={`Comment by ${displayName}`}>
        <Avatar className="tw-h-8 tw-w-8 tw-flex-shrink-0">
          <AvatarImage src={displayAvatar} alt={`${displayName}'s avatar`} />
          <AvatarFallback className="tw-bg-secondary tw-text-secondary-foreground">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <div className="tw-flex-1">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-1">
            <p className="tw-font-semibold tw-text-foreground">{displayName}</p>
            <span className="tw-text-xs tw-text-muted-foreground">
              {formatPostTimestamp(comment.created_at!)}
            </span>
          </div>
          {isEditing ? (
            <div className="tw-space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="tw-w-full tw-min-h-[60px]"
                disabled={isLoading}
                aria-label="Edit comment content"
              />
              <div className="tw-flex tw-justify-end tw-gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isLoading}>
                  <X className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Cancel
                </Button>
                <Button size="sm" onClick={handleEdit} disabled={isLoading}>
                  {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
                  <Save className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="tw-text-sm tw-text-foreground tw-whitespace-pre-wrap tw-leading-relaxed">{editedContent}</p>
          )}
          
          <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsReplying(prev => !prev)} 
              disabled={isLoading || !user}
              className="tw-text-muted-foreground hover:tw-text-primary"
              aria-label="Reply to comment"
            >
              <MessageSquare className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Reply
            </Button>
            {isOwner && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isLoading} aria-label="Edit comment">
                  <Edit className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading} className="tw-text-destructive hover:tw-text-destructive/80" aria-label="Delete comment">
                  <Trash2 className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {isReplying && (
        <ReplyForm
          incidentId={incidentId}
          parentCommentId={comment.id}
          onReplySubmitted={() => {
            setIsReplying(false);
            onReplySubmitted(); // Trigger re-fetch in parent
          }}
          onCancel={() => setIsReplying(false)}
        />
      )}

      {/* Recursive rendering of replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="tw-ml-8 tw-space-y-4">
          {comment.replies.map(reply => (
            <CommentCard
              key={reply.id}
              comment={reply}
              incidentId={incidentId}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              onReplySubmitted={onReplySubmitted}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentCard;
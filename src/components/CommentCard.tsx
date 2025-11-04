"use client";

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Edit, Trash2, Save, X } from 'lucide-react';
import { Comment, CommentService } from '@/services/CommentService'; // Import Comment
import { useAuth } from '@/hooks/useAuth';
import { formatPostTimestamp } from '@/lib/utils';
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService';

interface CommentCardProps {
  comment: Comment; // Use Comment type
  onCommentUpdated: (updatedComment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, onCommentUpdated, onCommentDeleted }) => {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user_id;
  const [isEditing, setIsEditing] = useState(false);
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
    if (window.confirm('Are you sure you want to delete this comment?')) {
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

  const displayName = comment.username || 'Anonymous';
  const displayAvatar = comment.avatar_url || undefined;
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
    <div className="tw-flex tw-gap-3 tw-p-4 tw-bg-background tw-rounded-lg tw-border tw-border-border" aria-label={`Comment by ${displayName}`}>
      <Avatar className="tw-h-8 tw-w-8">
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
        {isOwner && !isEditing && (
          <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isLoading} aria-label="Edit comment">
              <Edit className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading} className="tw-text-destructive hover:tw-text-destructive/80" aria-label="Delete comment">
              <Trash2 className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentCard;
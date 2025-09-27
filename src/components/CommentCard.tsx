import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Edit, Trash2, Save, X } from 'lucide-react';
import { Comment, PostService } from '@/services/PostService';
import { useAuth } from '@/hooks/useAuth';
import { formatPostTimestamp } from '@/lib/utils';
import { toast } from 'sonner';

interface CommentCardProps {
  comment: Comment;
  onCommentUpdated: (updatedComment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, onCommentUpdated, onCommentDeleted }) => {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = async () => {
    if (editedContent.trim() === '') {
      toast.error('Comment cannot be empty.');
      return;
    }
    setIsLoading(true);
    toast.loading('Updating comment...', { id: 'update-comment' });
    const updatedComment = await PostService.updateComment(comment.id, editedContent);
    setIsLoading(false);

    if (updatedComment) {
      toast.success('Comment updated!', { id: 'update-comment' });
      onCommentUpdated(updatedComment);
      setIsEditing(false);
    } else {
      toast.error('Failed to update comment.', { id: 'update-comment' });
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      setIsLoading(true);
      toast.loading('Deleting comment...', { id: 'delete-comment' });
      const success = await PostService.deleteComment(comment.id);
      setIsLoading(false);

      if (success) {
        toast.success('Comment deleted!', { id: 'delete-comment' });
        onCommentDeleted(comment.id);
      } else {
        toast.error('Failed to delete comment.', { id: 'delete-comment' });
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(comment.content);
    setIsEditing(false);
  };

  const displayName = comment.profiles?.first_name && comment.profiles?.last_name
    ? `${comment.profiles.first_name} ${comment.profiles.last_name}`
    : user?.email || 'Anonymous'; // Fallback to email if no profile name

  const displayAvatar = comment.profiles?.avatar_url || undefined;
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <div className="tw-flex tw-space-x-3 tw-p-3 tw-bg-muted/30 tw-rounded-lg tw-border tw-border-border">
      <Avatar className="tw-h-8 tw-w-8">
        <AvatarImage src={displayAvatar} alt={displayName} />
        <AvatarFallback className="tw-bg-secondary tw-text-secondary-foreground">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <div className="tw-flex-1">
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-1">
          <p className="tw-font-semibold tw-text-foreground">{displayName}</p>
          <span className="tw-text-xs tw-text-muted-foreground">
            {formatPostTimestamp(comment.created_at)}
          </span>
        </div>
        {isEditing ? (
          <div className="tw-space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="tw-w-full tw-min-h-[60px]"
              disabled={isLoading}
            />
            <div className="tw-flex tw-justify-end tw-gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isLoading}>
                <X className="tw-h-4 tw-w-4 tw-mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleEdit} disabled={isLoading}>
                {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
                <Save className="tw-h-4 tw-w-4 tw-mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="tw-text-sm tw-text-foreground tw-whitespace-pre-wrap">{comment.content}</p>
        )}
        {isOwner && !isEditing && (
          <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isLoading}>
              <Edit className="tw-h-4 tw-w-4 tw-mr-1" /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading} className="tw-text-destructive hover:tw-text-destructive/80">
              <Trash2 className="tw-h-4 tw-w-4 tw-mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentCard;
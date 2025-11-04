"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { CommentService } from '@/services/CommentService';
import { AnalyticsService } from '@/services/AnalyticsService';

interface ReplyFormProps {
  incidentId: string;
  parentCommentId: string;
  onReplySubmitted: () => void;
  onCancel: () => void;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ incidentId, parentCommentId, onReplySubmitted, onCancel }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReply = async () => {
    if (!user) {
      handleError(null, 'You must be logged in to reply.');
      AnalyticsService.trackEvent({ name: 'add_reply_attempt_failed', properties: { reason: 'not_logged_in' } });
      return;
    }
    if (content.trim() === '') {
      handleError(null, 'Reply cannot be empty.');
      AnalyticsService.trackEvent({ name: 'add_reply_attempt_failed', properties: { reason: 'empty_content' } });
      return;
    }

    setIsSubmitting(true);
    try {
      toast.loading('Adding reply...', { id: 'add-reply' });
      const newReply = await CommentService.addComment(incidentId, user.id, content, parentCommentId);
      
      if (newReply) {
        toast.success('Reply added!', { id: 'add-reply' });
        setContent('');
        onReplySubmitted();
        AnalyticsService.trackEvent({ name: 'reply_added', properties: { incidentId, parentCommentId, userId: user.id } });
      } else {
        handleError(null, 'Failed to add reply.', { id: 'add-reply' });
        AnalyticsService.trackEvent({ name: 'add_reply_failed', properties: { incidentId, parentCommentId, userId: user.id } });
      }
    } catch (err) {
      handleError(err, 'An error occurred while adding the reply.', { id: 'add-reply' });
      AnalyticsService.trackEvent({ name: 'add_reply_error', properties: { incidentId, parentCommentId, userId: user.id, error: (err as Error).message } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tw-mt-3 tw-space-y-2 tw-pl-4 tw-border-l-2 tw-border-muted">
      <Textarea
        placeholder="Write your reply..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isSubmitting || !user}
        className="tw-w-full tw-min-h-[60px]"
        aria-label="Reply content"
      />
      <div className="tw-flex tw-justify-end tw-gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleReply} disabled={isSubmitting || content.trim() === ''}>
          {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
          <Send className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Reply
        </Button>
      </div>
      {!user && (
        <p className="tw-text-xs tw-text-destructive">You must be logged in to reply.</p>
      )}
    </div>
  );
};

export default ReplyForm;
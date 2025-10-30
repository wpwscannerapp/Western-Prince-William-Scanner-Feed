"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Incident, IncidentService } from '@/services/IncidentService';
import { Comment, CommentService } from '@/services/CommentService';
import IncidentCard from '@/components/IncidentCard';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleError } from '@/utils/errorHandler';
import { Input } from '@/components/ui/input';
import CommentCard from '@/components/CommentCard';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService
// import IncidentMap from '@/components/IncidentMap'; // Direct import - REMOVED

const IncidentDetailPage: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousIncident, setPreviousIncident] = useState<Incident | null>(null);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchSingleIncident = useCallback(async () => {
    if (!incidentId) {
      setError('Incident ID is missing.');
      setLoading(false);
      AnalyticsService.trackEvent({ name: 'incident_detail_load_failed', properties: { reason: 'missing_id' } });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedIncident = await IncidentService.fetchSingleIncident(incidentId);
      if (fetchedIncident) {
        setIncident(fetchedIncident);
        const fetchedPreviousIncident = await IncidentService.fetchPreviousIncident(fetchedIncident.date);
        setPreviousIncident(fetchedPreviousIncident);
        AnalyticsService.trackEvent({ name: 'incident_detail_loaded', properties: { incidentId } });
      } else {
        setError(handleError(null, 'Failed to load incident or incident not found.'));
        AnalyticsService.trackEvent({ name: 'incident_detail_load_failed', properties: { incidentId, reason: 'not_found' } });
      }
    } catch (err) {
      setError(handleError(err, 'An unexpected error occurred while loading the incident.'));
      AnalyticsService.trackEvent({ name: 'incident_detail_load_failed', properties: { incidentId, reason: 'unexpected_error', error: (err as Error).message } });
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  const fetchCommentsForIncident = useCallback(async () => {
    if (!incidentId) return;
    setLoadingComments(true);
    try {
      const fetchedComments = await CommentService.fetchComments(incidentId);
      setComments(fetchedComments);
      AnalyticsService.trackEvent({ name: 'comments_loaded', properties: { incidentId, count: fetchedComments.length } });
    } catch (err) {
      setError(handleError(err, 'Failed to load comments. Please try again.'));
      AnalyticsService.trackEvent({ name: 'comments_load_failed', properties: { incidentId, error: (err as Error).message } });
    } finally {
      setLoadingComments(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchSingleIncident();
    fetchCommentsForIncident();

    const commentsChannel = supabase
      .channel(`public:comments:incident_id=eq.${incidentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `incident_id=eq.${incidentId}` }, () => {
        fetchCommentsForIncident();
        AnalyticsService.trackEvent({ name: 'comments_realtime_update_received', properties: { incidentId } });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [fetchSingleIncident, fetchCommentsForIncident, incidentId]);

  const handleAddComment = async () => {
    if (!user) {
      handleError(null, 'You must be logged in to comment.');
      AnalyticsService.trackEvent({ name: 'add_comment_attempt_failed', properties: { reason: 'not_logged_in' } });
      return;
    }
    if (newCommentContent.trim() === '') {
      handleError(null, 'Comment cannot be empty.');
      AnalyticsService.trackEvent({ name: 'add_comment_attempt_failed', properties: { reason: 'empty_content' } });
      return;
    }
    if (!incidentId) {
      handleError(null, 'Incident ID is missing for commenting.');
      AnalyticsService.trackEvent({ name: 'add_comment_attempt_failed', properties: { reason: 'missing_incident_id' } });
      return;
    }

    setIsCommenting(true);
    try {
      toast.loading('Adding comment...', { id: 'add-comment' });
      const newComment = await CommentService.addComment(incidentId, user.id, newCommentContent);
      
      if (newComment) {
        toast.success('Comment added!', { id: 'add-comment' });
        setNewCommentContent('');
        AnalyticsService.trackEvent({ name: 'comment_added_from_detail', properties: { incidentId, userId: user.id } });
      } else {
        handleError(null, 'Failed to add comment.', { id: 'add-comment' });
        AnalyticsService.trackEvent({ name: 'add_comment_failed_from_detail', properties: { incidentId, userId: user.id } });
      }
    } catch (err) {
      handleError(err, 'An error occurred while adding the comment.', { id: 'add-comment' });
      AnalyticsService.trackEvent({ name: 'add_comment_error_from_detail', properties: { incidentId, userId: user.id, error: (err as Error).message } });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleCommentUpdated = (updatedComment: Comment) => {
    setComments(prev => prev.map(c => (c.id === updatedComment.id ? updatedComment : c)));
    AnalyticsService.trackEvent({ name: 'comment_updated_in_detail', properties: { commentId: updatedComment.id, incidentId } });
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    AnalyticsService.trackEvent({ name: 'comment_deleted_in_detail', properties: { commentId, incidentId } });
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
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading incident details" />
        <p className="tw-ml-2">Loading incident...</p>
      </div>
    );
  }

  if (!incident && !loading && !error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-foreground tw-mb-4">Incident Not Found</h1>
          <p className="tw-text-muted-foreground">The incident you are looking for does not exist or has been removed.</p>
          <Button onClick={() => navigate('/home')} className="tw-mt-4 tw-button">Go to Home Page</Button>
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
            <Button onClick={fetchSingleIncident} className="tw-button">Retry</Button>
            <Button onClick={() => navigate('/home')} variant="outline" className="tw-button">Go to Home Page</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return null;
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-3xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Home Page
      </Button>
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Incident Detail</h1>
      <div className="tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-md" aria-labelledby={`incident-title-${incident.id}`}>
        <IncidentCard incident={incident} /> 
      </div>

      <div className="tw-mt-8 tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-md">
        <h2 className="tw-text-2xl tw-font-semibold tw-mb-4 tw-text-foreground tw-flex tw-items-center tw-gap-2">
          <MessageCircle className="tw-h-6 tw-w-6" aria-hidden="true" /> Comments ({comments.length})
        </h2>
        <div className="tw-flex tw-gap-2 tw-mb-6">
          <Input
            placeholder="Add a comment..."
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isCommenting || !user}
            className="tw-flex-1 tw-input"
            aria-label="New comment content"
          />
          <Button onClick={handleAddComment} disabled={isCommenting || !user} className="tw-button">
            {isCommenting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
            Comment
          </Button>
        </div>

        {loadingComments ? (
          <div className="tw-flex tw-justify-center tw-py-4">
            <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" aria-label="Loading comments" />
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

      {previousIncident && (
        <div className="tw-mt-8">
          <h2 className="tw-text-2xl tw-font-semibold tw-mb-4 tw-text-foreground">Previous Incident</h2>
          <div className="tw-grid tw-grid-cols-1">
            <IncidentCard incident={previousIncident} />
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentDetailPage;
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Incident, IncidentService } from '@/services/IncidentService';
import { CommentService } from '@/services/CommentService';
import IncidentCard from '@/components/IncidentCard';
import IncidentUpdateSection from '@/components/IncidentUpdateSection'; // Import new component
import { Loader2, MessageCircle, Image as ImageIcon, XCircle, Edit, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleError } from '@/utils/errorHandler';
import CommentCard from '@/components/CommentCard';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsService } from '@/services/AnalyticsService';
import { CommentWithProfile } from '@/types/supabase';
import { Textarea } from '@/components/ui/textarea';
import { useIsSubscribed } from '@/hooks/useIsSubscribed'; // Import useIsSubscribed
import { useIsAdmin } from '@/hooks/useIsAdmin'; // Import useIsAdmin
import SubscribeOverlay from '@/components/SubscribeOverlay'; // Import SubscribeOverlay
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import IncidentForm from '@/components/IncidentForm'; // Import IncidentForm

const IncidentDetailPage: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubscribed, loading: isSubscribedLoading } = useIsSubscribed();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();

  const canComment = isSubscribed || isAdmin;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousIncident, setPreviousIncident] = useState<Incident | null>(null);
  
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // --- New Admin Edit State ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdatingIncident, setIsUpdatingIncident] = useState(false);
  // --- End New Admin Edit State ---

  // --- Media State ---
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // --- End Media State ---

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
        const fetchedPreviousIncident = await IncidentService.fetchPreviousIncident(fetchedIncident.date!);
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
      // Fetch only user comments (category 'user')
      const fetchedComments = await CommentService.fetchComments(incidentId, 'user');
      setComments(fetchedComments);
      AnalyticsService.trackEvent({ name: 'user_comments_loaded', properties: { incidentId, count: fetchedComments.length } });
    } catch (err) {
      setError(handleError(err, 'Failed to load user comments. Please try again.'));
      AnalyticsService.trackEvent({ name: 'user_comments_load_failed', properties: { incidentId, error: (err as Error).message } });
    } finally {
      setLoadingComments(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchSingleIncident();
    fetchCommentsForIncident();

    // Realtime subscription for user comments only
    const commentsChannel = supabase
      .channel(`public:user_comments:incident_id=eq.${incidentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `incident_id=eq.${incidentId}&category=eq.user` }, () => {
        // Re-fetch all user comments to rebuild the tree on any change (insert, update, delete)
        fetchCommentsForIncident();
        AnalyticsService.trackEvent({ name: 'user_comments_realtime_update_received', properties: { incidentId } });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [fetchSingleIncident, fetchCommentsForIncident, incidentId]);

  // Cleanup media preview URL on unmount
  useEffect(() => {
    return () => {
      if (mediaPreview && mediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (mediaPreview && mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview);
    }

    if (file) {
      // Simple check for file type (allowing images and common video formats)
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Only images and videos are supported.');
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaFile(null);
      setMediaPreview(null);
    }
  };

  const handleRemoveMedia = () => {
    if (mediaPreview && mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddComment = async () => {
    if (!user) {
      handleError(null, 'You must be logged in to comment.');
      AnalyticsService.trackEvent({ name: 'add_comment_attempt_failed', properties: { reason: 'not_logged_in' } });
      return;
    }
    if (newCommentContent.trim() === '' && !mediaFile) {
      handleError(null, 'Comment cannot be empty without media.');
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
      
      // Pass mediaFile to the service
      const newComment = await CommentService.addComment(incidentId, user.id, newCommentContent, null, 'user', mediaFile);
      
      if (newComment) {
        toast.success('Comment added!', { id: 'add-comment' });
        setNewCommentContent('');
        handleRemoveMedia(); // Clear media state
        AnalyticsService.trackEvent({ name: 'comment_added_from_detail', properties: { incidentId, userId: user.id, hasMedia: !!mediaFile } });
      } else {
        handleError(null, 'Failed to add comment.', { id: 'add-comment' });
        AnalyticsService.trackEvent({ name: 'add_comment_failed_from_detail', properties: { incidentId, userId: user.id, hasMedia: !!mediaFile } });
      }
    } catch (err) {
      handleError(err, 'An error occurred while adding the comment.', { id: 'add-comment' });
      AnalyticsService.trackEvent({ name: 'add_comment_error_from_detail', properties: { incidentId, userId: user.id, error: (err as Error).message } });
    } finally {
      setIsCommenting(false);
    }
  };

  // This function is passed down to CommentCard and its recursive calls
  const handleCommentUpdated = (updatedComment: CommentWithProfile) => {
    // Trigger a full re-fetch of user comments
    fetchCommentsForIncident();
    AnalyticsService.trackEvent({ name: 'comment_updated_in_detail', properties: { commentId: updatedComment.id, incidentId } });
  };

  // This function is passed down to CommentCard and its recursive calls
  const handleCommentDeleted = (commentId: string) => {
    // Trigger a full re-fetch of user comments
    fetchCommentsForIncident();
    AnalyticsService.trackEvent({ name: 'comment_deleted_in_detail', properties: { commentId, incidentId } });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAddComment();
    }
  };

  // --- Admin Incident Update Handler ---
  const handleUpdateIncident = async (type: string, location: string, description: string, imageFile: File | null, currentImageUrl: string | null, latitude: number | undefined, longitude: number | undefined): Promise<boolean> => {
    if (!incident) return false;

    setIsUpdatingIncident(true);
    try {
      toast.loading('Updating incident...', { id: 'update-incident' });
      const title = `${type} at ${location}`;
      const updatedIncident = await IncidentService.updateIncident(incident.id, {
        title,
        type,
        location,
        description,
        date: incident.date,
      }, imageFile, currentImageUrl, latitude, longitude);
      
      if (updatedIncident) {
        toast.success('Incident updated successfully!', { id: 'update-incident' });
        setIncident(updatedIncident); // Update local state immediately
        setIsEditDialogOpen(false);
        AnalyticsService.trackEvent({ name: 'admin_incident_updated_from_detail', properties: { incidentId: updatedIncident.id } });
        return true;
      } else {
        toast.error('Failed to update incident.', { id: 'update-incident' });
        AnalyticsService.trackEvent({ name: 'admin_incident_update_failed_from_detail', properties: { incidentId: incident.id } });
        return false;
      }
    } catch (err) {
      toast.error('An error occurred while updating the incident.', { id: 'update-incident' });
      AnalyticsService.trackEvent({ name: 'admin_incident_update_error_from_detail', properties: { incidentId: incident.id, error: (err as Error).message } });
      return false;
    } finally {
      setIsUpdatingIncident(false);
    }
  };
  // --- End Admin Incident Update Handler ---


  if (loading || isSubscribedLoading || isAdminLoading) {
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
      <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-text-foreground tw-text-center">Incident Detail</h1>
        {isAdmin && (
          <Button onClick={() => setIsEditDialogOpen(true)} className="tw-button" aria-label="Edit incident details">
            <Edit className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Edit Incident
          </Button>
        )}
      </div>
      
      <div className="tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-md" aria-labelledby={`incident-title-${incident.id}`}>
        <IncidentCard incident={incident} /> 
      </div>

      {/* NEW: Incident Updates Section */}
      <IncidentUpdateSection incidentId={incidentId!} />

      {/* Existing User Comments Section */}
      <div className="tw-mt-8 tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-md">
        <h2 className="tw-text-2xl tw-font-semibold tw-mb-4 tw-text-foreground tw-flex tw-items-center tw-gap-2">
          <MessageCircle className="tw-h-6 tw-w-6" aria-hidden="true" /> User Comments ({comments.length})
        </h2>
        
        <div className={`tw-space-y-6 ${!canComment ? 'tw-relative' : ''}`}>
          <div className={!canComment ? 'tw-blur-sm tw-pointer-events-none' : ''}>
            <div className="tw-flex tw-flex-col tw-gap-2 tw-mb-6 tw-border tw-p-3 tw-rounded-lg tw-bg-muted/10">
              <Textarea
                placeholder="Add a comment..."
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isCommenting || !user}
                className="tw-flex-1 tw-input tw-min-h-[80px]"
                aria-label="New comment content"
              />
              
              <div className="tw-flex tw-justify-between tw-items-center tw-mt-2">
                <div className="tw-relative tw-flex tw-items-center tw-gap-2">
                  <label htmlFor="comment-media-upload" className="tw-cursor-pointer tw-text-muted-foreground hover:tw-text-primary tw-transition-colors">
                    <ImageIcon className="tw-h-5 tw-w-5" aria-hidden="true" />
                    <span className="tw-sr-only">Upload Image or Video</span>
                  </label>
                  <Input
                    id="comment-media-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    className="tw-hidden"
                    disabled={isCommenting || !user}
                    ref={fileInputRef}
                  />
                  {mediaPreview && (
                    <div className="tw-relative tw-h-10 tw-w-10 tw-rounded-md tw-overflow-hidden tw-border tw-border-border">
                      {mediaFile?.type.startsWith('image/') ? (
                        <img src={mediaPreview} alt="Media preview" className="tw-w-full tw-h-full tw-object-cover" />
                      ) : (
                        <video src={mediaPreview} className="tw-w-full tw-h-full tw-object-cover" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="tw-absolute tw-top-0 tw-right-0 tw-h-5 tw-w-5 tw-rounded-full tw-bg-background/70 hover:tw-bg-background"
                        onClick={handleRemoveMedia}
                        disabled={isCommenting}
                      >
                        <XCircle className="tw-h-3 tw-w-3 tw-text-destructive" aria-hidden="true" />
                        <span className="tw-sr-only">Remove media</span>
                      </Button>
                    </div>
                  )}
                  {mediaFile && (
                    <span className="tw-text-xs tw-text-muted-foreground">{mediaFile.name}</span>
                  )}
                </div>
                
                <Button onClick={handleAddComment} disabled={isCommenting || !user || (newCommentContent.trim() === '' && !mediaFile)} className="tw-button tw-self-start">
                  {isCommenting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
                  Comment
                </Button>
              </div>
            </div>
            {!user && (
              <p className="tw-text-sm tw-text-destructive tw-mb-4">You must be logged in to post comments.</p>
            )}

            {loadingComments ? (
              <div className="tw-flex tw-justify-center tw-py-4">
                <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" aria-hidden="true" />
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
                      incidentId={incidentId!}
                      onCommentUpdated={handleCommentUpdated}
                      onCommentDeleted={handleCommentDeleted}
                      onReplySubmitted={fetchCommentsForIncident} // Re-fetch all comments to rebuild the tree
                    />
                  ))
                )}
              </div>
            )}
          </div>
          {!canComment && <SubscribeOverlay />}
        </div>
      </div>

      {previousIncident && (
        <div className="tw-mt-8">
          <h2 className="tw-2xl tw-font-semibold tw-mb-4 tw-text-foreground">Previous Incident</h2>
          <div className="tw-grid tw-grid-cols-1">
            <IncidentCard incident={previousIncident} />
          </div>
        </div>
      )}

      {/* Admin Edit Dialog */}
      {isAdmin && incident && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:tw-max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Incident: {incident.title}</DialogTitle>
              <DialogDescription>Update the details, location, or image for this incident.</DialogDescription>
            </DialogHeader>
            <IncidentForm
              formId="edit-incident-detail-form"
              onSubmit={handleUpdateIncident}
              isLoading={isUpdatingIncident}
              initialIncident={incident}
            />
            <DialogFooter>
              <Button 
                type="submit" 
                form="edit-incident-detail-form"
                disabled={isUpdatingIncident} 
                className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground"
              >
                {isUpdatingIncident && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
                <Save className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default IncidentDetailPage;
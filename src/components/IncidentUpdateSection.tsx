"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, MessageSquare, Shield, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { CommentService, Comment } from '@/services/CommentService';
import { AnalyticsService } from '@/services/AnalyticsService';
import { formatPostTimestamp } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface IncidentUpdateSectionProps {
  incidentId: string;
}

// Component to display a single update (similar to CommentCard but simplified)
const UpdateItem: React.FC<{ update: Comment, onUpdateDeleted: (id: string) => void }> = ({ update, onUpdateDeleted }) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const isOwner = user?.id === update.user_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(update.content);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = async () => {
    if (editedContent.trim() === '') {
      toast.error('Update cannot be empty.');
      return;
    }
    setIsLoading(true);
    try {
      toast.loading('Updating incident update...', { id: 'update-update' });
      const updatedComment = await CommentService.updateComment(update.id, editedContent);
      
      if (updatedComment) {
        toast.success('Update saved!', { id: 'update-update' });
        setIsEditing(false);
        // Note: Relying on the parent component's fetchUpdates to refresh the list
        AnalyticsService.trackEvent({ name: 'incident_update_edited', properties: { updateId: update.id } });
      } else {
        toast.error('Failed to save update.', { id: 'update-update' });
      }
    } catch (err) {
      handleError(err, 'An error occurred while saving the update.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this incident update?')) {
      setIsLoading(true);
      try {
        toast.loading('Deleting update...', { id: 'delete-update' });
        const success = await CommentService.deleteComment(update.id);
        
        if (success) {
          toast.success('Update deleted!', { id: 'delete-update' });
          onUpdateDeleted(update.id);
          AnalyticsService.trackEvent({ name: 'incident_update_deleted', properties: { updateId: update.id } });
        } else {
          toast.error('Failed to delete update.', { id: 'delete-update' });
        }
      } catch (err) {
        handleError(err, 'An error occurred while deleting the update.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="tw-p-4 tw-bg-muted/30 tw-border-l-4 tw-border-primary tw-shadow-sm">
      <CardContent className="tw-p-0 tw-space-y-2">
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
          <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-semibold tw-text-primary">
            <Shield className="tw-h-4 tw-w-4" aria-hidden="true" />
            Admin Update
          </div>
          <span className="tw-text-xs tw-text-muted-foreground">
            {formatPostTimestamp(update.created_at!)}
          </span>
        </div>

        {isEditing ? (
          <div className="tw-space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="tw-w-full tw-min-h-[60px] tw-text-foreground tw-bg-input"
              disabled={isLoading}
              aria-label="Edit update content"
            />
            <div className="tw-flex tw-justify-end tw-gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleEdit} disabled={isLoading}>
                {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="tw-text-sm tw-text-foreground tw-whitespace-pre-wrap tw-leading-relaxed">{editedContent}</p>
        )}

        {(isAdmin || isOwner) && !isEditing && (
          <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isLoading} aria-label="Edit update">
              <Edit className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading} className="tw-text-destructive hover:tw-text-destructive/80" aria-label="Delete update">
              <Trash2 className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


const IncidentUpdateSection: React.FC<IncidentUpdateSectionProps> = ({ incidentId }) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [updates, setUpdates] = useState<Comment[]>([]);
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

  const fetchUpdates = useCallback(async () => {
    setLoadingUpdates(true);
    try {
      // Fetch comments specifically categorized as 'update'
      const fetchedUpdates = await CommentService.fetchComments(incidentId, 'update');
      setUpdates(fetchedUpdates);
      AnalyticsService.trackEvent({ name: 'incident_updates_loaded', properties: { incidentId, count: fetchedUpdates.length } });
    } catch (err) {
      handleError(err, 'Failed to load incident updates.');
      AnalyticsService.trackEvent({ name: 'incident_updates_load_failed', properties: { incidentId, error: (err as Error).message } });
    } finally {
      setLoadingUpdates(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchUpdates();

    // Realtime subscription for updates
    const updatesChannel = supabase
      .channel(`public:updates:incident_id=eq.${incidentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `incident_id=eq.${incidentId}&category=eq.update` }, () => {
        fetchUpdates();
        AnalyticsService.trackEvent({ name: 'incident_updates_realtime_update', properties: { incidentId } });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(updatesChannel);
    };
  }, [incidentId, fetchUpdates]);

  const handleAddUpdate = async () => {
    if (!user || !isAdmin) {
      handleError(null, 'Only administrators can post incident updates.');
      return;
    }
    if (newUpdateContent.trim() === '') {
      handleError(null, 'Update cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      toast.loading('Posting update...', { id: 'add-update' });
      // Use category 'update'
      const newUpdate = await CommentService.addComment(incidentId, user.id, newUpdateContent, null, 'update');
      
      if (newUpdate) {
        toast.success('Update posted!', { id: 'add-update' });
        setNewUpdateContent('');
        // Realtime listener will trigger fetchUpdates
        AnalyticsService.trackEvent({ name: 'incident_update_added', properties: { incidentId, userId: user.id } });
      } else {
        handleError(null, 'Failed to post update.', { id: 'add-update' });
      }
    } catch (err) {
      handleError(err, 'An error occurred while posting the update.', { id: 'add-update' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDeleted = (deletedId: string) => {
    setUpdates(prev => prev.filter(u => u.id !== deletedId));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAddUpdate();
    }
  };

  return (
    <div className="tw-mt-8 tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-md">
      <h2 className="tw-text-2xl tw-font-semibold tw-mb-4 tw-text-foreground tw-flex tw-items-center tw-gap-2">
        <MessageSquare className="tw-h-6 tw-w-6" aria-hidden="true" /> Incident Updates ({updates.length})
      </h2>

      {isAdmin && user && (
        <div className="tw-flex tw-gap-2 tw-mb-6 tw-border tw-p-3 tw-rounded-lg tw-bg-muted/10">
          <Textarea
            placeholder="Post an official incident update (Admin Only)..."
            value={newUpdateContent}
            onChange={(e) => setNewUpdateContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            className="tw-flex-1 tw-input tw-min-h-[80px] tw-text-foreground tw-bg-input"
            aria-label="New incident update content"
          />
          <Button onClick={handleAddUpdate} disabled={isSubmitting || newUpdateContent.trim() === ''} className="tw-button tw-self-start">
            {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
            <Send className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> Post Update
          </Button>
        </div>
      )}
      
      {!isAdmin && (
        <p className="tw-text-sm tw-text-muted-foreground tw-mb-6 tw-p-3 tw-border tw-rounded-lg">
          <Shield className="tw-h-4 tw-w-4 tw-inline tw-mr-1" aria-hidden="true" /> Only administrators can post official incident updates here.
        </p>
      )}

      {loadingUpdates ? (
        <div className="tw-flex tw-justify-center tw-py-4">
          <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" aria-hidden="true" />
          <span className="tw-ml-2 tw-text-muted-foreground">Loading updates...</span>
        </div>
      ) : (
        <div className="tw-space-y-4">
          {updates.length === 0 ? (
            <p className="tw-text-sm tw-text-muted-foreground tw-text-center tw-py-4">No official updates posted yet.</p>
          ) : (
            updates.map(update => (
              <UpdateItem 
                key={update.id} 
                update={update} 
                onUpdateDeleted={handleUpdateDeleted} 
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default IncidentUpdateSection;
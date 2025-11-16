"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, User, Mail, Phone, CheckCircle2, XCircle, CalendarDays, MessageSquare, Trash2 } from 'lucide-react';
import { FeedbackService } from '@/services/FeedbackService';
import { handleError } from '@/utils/errorHandler';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService';
import { FeedbackWithProfile } from '@/types/supabase';

interface FeedbackDetailDialogProps {
  feedbackId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: () => void;
}

const FeedbackDetailDialog: React.FC<FeedbackDetailDialogProps> = ({
  feedbackId,
  isOpen,
  onClose,
  onDeleteSuccess,
}) => {
  const [feedback, setFeedback] = useState<FeedbackWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('FeedbackDetailDialog: useEffect triggered. isOpen:', isOpen, 'feedbackId:', feedbackId);
    }

    const fetchFeedbackDetails = async () => {
      if (!feedbackId) {
        if (import.meta.env.DEV) {
          console.log('FeedbackDetailDialog: No feedbackId provided, skipping fetch.');
        }
        setFeedback(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      if (import.meta.env.DEV) {
        console.log('FeedbackDetailDialog: Fetching details for feedbackId:', feedbackId);
      }
      try {
        const fetchedFeedback = await FeedbackService.fetchFeedbackById(feedbackId);
        setFeedback(fetchedFeedback);
        AnalyticsService.trackEvent({ name: 'feedback_detail_dialog_opened', properties: { feedbackId } });
        if (import.meta.env.DEV) {
          console.log('FeedbackDetailDialog: Fetched feedback:', fetchedFeedback);
        }
      } catch (err) {
        setError(handleError(err, 'Failed to load feedback details.'));
        AnalyticsService.trackEvent({ name: 'feedback_detail_dialog_load_failed', properties: { feedbackId, error: (err as Error).message } });
        if (import.meta.env.DEV) {
          console.error('FeedbackDetailDialog: Error fetching feedback:', err);
        }
      } finally {
        setLoading(false);
        if (import.meta.env.DEV) {
          console.log('FeedbackDetailDialog: Loading finished.');
        }
      }
    };

    if (isOpen) {
      fetchFeedbackDetails();
    } else {
      // Reset state when dialog closes
      if (import.meta.env.DEV) {
        console.log('FeedbackDetailDialog: Dialog closed, resetting state.');
      }
      setFeedback(null);
      setLoading(true);
      setDeleting(false);
      setError(null);
    }
  }, [feedbackId, isOpen]);

  const handleDelete = async () => {
    if (!feedbackId || !window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    if (import.meta.env.DEV) {
      console.log('FeedbackDetailDialog: Attempting to delete feedback:', feedbackId);
    }
    try {
      toast.loading('Deleting feedback...', { id: 'delete-feedback-detail' });
      const success = await FeedbackService.deleteFeedback(feedbackId);
      if (success) {
        toast.success('Feedback deleted successfully!', { id: 'delete-feedback-detail' });
        onDeleteSuccess();
        onClose();
        AnalyticsService.trackEvent({ name: 'feedback_deleted_from_detail', properties: { feedbackId } });
        if (import.meta.env.DEV) {
          console.log('FeedbackDetailDialog: Feedback deleted successfully.');
        }
      } else {
        toast.error('Failed to delete feedback.', { id: 'delete-feedback-detail' });
        AnalyticsService.trackEvent({ name: 'feedback_delete_failed_from_detail', properties: { feedbackId } });
        if (import.meta.env.DEV) {
          console.error('FeedbackDetailDialog: Failed to delete feedback.');
        }
      }
    } catch (err) {
      toast.error('An error occurred while deleting feedback.', { id: 'delete-feedback-detail' });
      AnalyticsService.trackEvent({ name: 'feedback_delete_error_from_detail', properties: { feedbackId, error: (err as Error).message } });
      if (import.meta.env.DEV) {
        console.error('FeedbackDetailDialog: Error during deletion:', err);
      }
    } finally {
      setDeleting(false);
      if (import.meta.env.DEV) {
        console.log('FeedbackDetailDialog: Deletion process finished.');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:tw-max-w-[600px] tw-max-h-[90vh] tw-overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tw-text-2xl tw-font-bold tw-text-foreground">Feedback Details</DialogTitle>
          <DialogDescription className="tw-text-muted-foreground">
            Full content of the submitted feedback.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
            <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-hidden="true" />
            <span className="tw-ml-2 tw-text-muted-foreground">Loading feedback...</span>
          </div>
        ) : error ? (
          <div className="tw-text-center tw-text-destructive tw-py-8">
            <p>Error: {error}</p>
            <Button onClick={onClose} className="tw-mt-4">Close</Button>
          </div>
        ) : feedback ? (
          <div className="tw-space-y-4 tw-py-4">
            <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-muted-foreground">
              <CalendarDays className="tw-h-4 tw-w-4" aria-hidden="true" />
              <span>{format(new Date(feedback.created_at!), 'MMM dd, yyyy, hh:mm a')}</span>
            </div>

            <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-foreground">
              <User className="tw-h-4 tw-w-4" aria-hidden="true" />
              <span>Submitted by: {feedback.profiles?.[0]?.username || 'Anonymous'}</span>
            </div>

            {feedback.subject && (
              <div>
                <p className="tw-font-semibold tw-text-foreground tw-mb-1">Subject:</p>
                <p className="tw-text-sm tw-text-muted-foreground tw-p-2 tw-bg-muted/20 tw-rounded-md">{feedback.subject}</p>
              </div>
            )}

            <div>
              <p className="tw-font-semibold tw-text-foreground tw-mb-1">Message:</p>
              <p className="tw-text-sm tw-text-foreground tw-whitespace-pre-wrap tw-p-2 tw-bg-muted/20 tw-rounded-md">{feedback.message}</p>
            </div>

            <div className="tw-space-y-2 tw-p-3 tw-border tw-rounded-md tw-bg-muted/10">
              <p className="tw-font-semibold tw-text-foreground">Contact Information:</p>
              <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-foreground">
                <Mail className="tw-h-4 tw-w-4" aria-hidden="true" />
                <span>Email: {feedback.contact_email || 'N/A'}</span>
              </div>
              <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-foreground">
                <Phone className="tw-h-4 tw-w-4" aria-hidden="true" />
                <span>Phone: {feedback.contact_phone || 'N/A'}</span>
              </div>
              <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-foreground">
                <MessageSquare className="tw-h-4 tw-w-4" aria-hidden="true" />
                <span>Allow Contact: 
                  {feedback.allow_contact ? (
                    <CheckCircle2 className="tw-h-4 tw-w-4 tw-text-green-500 tw-inline-block tw-ml-1" aria-label="Yes" />
                  ) : (
                    <XCircle className="tw-h-4 tw-w-4" tw-text-destructive tw-inline-block tw-ml-1" aria-label="No" />
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="tw-text-center tw-text-muted-foreground tw-py-8">
            <p>Feedback not found.</p>
          </div>
        )}

        <DialogFooter className="tw-flex tw-justify-between tw-mt-4">
          <Button variant="destructive" onClick={handleDelete} disabled={deleting || loading || !feedback}>
            {deleting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
            <Trash2 className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Delete Feedback
          </Button>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDetailDialog;
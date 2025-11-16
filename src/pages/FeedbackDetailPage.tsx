"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, User, Mail, Phone, CheckCircle2, XCircle, MessageSquare, Trash2, ArrowLeft } from 'lucide-react'; // Removed CalendarDays
import { FeedbackService } from '@/services/FeedbackService';
import { handleError } from '@/utils/errorHandler';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService';
import { FeedbackWithProfile } from '@/types/supabase';

const FeedbackDetailPage: React.FC = () => {
  const { feedbackId } = useParams<{ feedbackId: string }>();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedbackDetails = async () => {
      if (!feedbackId) {
        setError('Feedback ID is missing.');
        setLoading(false);
        AnalyticsService.trackEvent({ name: 'feedback_detail_page_load_failed', properties: { reason: 'missing_id' } });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const fetchedFeedback = await FeedbackService.fetchFeedbackById(feedbackId);
        if (fetchedFeedback) {
          setFeedback(fetchedFeedback);
          AnalyticsService.trackEvent({ name: 'feedback_detail_page_loaded', properties: { feedbackId } });
        } else {
          setError(handleError(null, 'Feedback not found.'));
          AnalyticsService.trackEvent({ name: 'feedback_detail_page_load_failed', properties: { feedbackId, reason: 'not_found' } });
        }
      } catch (err) {
        setError(handleError(err, 'An unexpected error occurred while loading the feedback.'));
        AnalyticsService.trackEvent({ name: 'feedback_detail_page_load_failed', properties: { feedbackId, reason: 'unexpected_error', error: (err as Error).message } });
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackDetails();
  }, [feedbackId]);

  const handleDelete = async () => {
    if (!feedbackId || !window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      toast.loading('Deleting feedback...', { id: 'delete-feedback-page' });
      const success = await FeedbackService.deleteFeedback(feedbackId);
      if (success) {
        toast.success('Feedback deleted successfully!', { id: 'delete-feedback-page' });
        AnalyticsService.trackEvent({ name: 'feedback_deleted_from_detail_page', properties: { feedbackId } });
        navigate('/admin'); // Navigate back to admin dashboard after deletion
      } else {
        toast.error('Failed to delete feedback.', { id: 'delete-feedback-page' });
        AnalyticsService.trackEvent({ name: 'feedback_delete_failed_from_detail_page', properties: { feedbackId } });
      }
    } catch (err) {
      toast.error('An error occurred while deleting feedback.', { id: 'delete-feedback-page' });
      AnalyticsService.trackEvent({ name: 'feedback_delete_error_from_detail_page', properties: { feedbackId, error: (err as Error).message } });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-hidden="true" />
        <p className="tw-ml-2">Loading feedback details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error</h1>
          <p className="tw-text-muted-foreground">{error}</p>
          <Button onClick={() => navigate(-1)} className="tw-mt-4 tw-button">
            <ArrowLeft className="tw-mr-2 tw-h-4 tw-w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-foreground tw-mb-4">Feedback Not Found</h1>
          <p className="tw-text-muted-foreground">The feedback entry you are looking for does not exist or has been removed.</p>
          <Button onClick={() => navigate(-1)} className="tw-mt-4 tw-button">
            <ArrowLeft className="tw-mr-2 tw-h-4 tw-w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-3xl">
      <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <Button onClick={() => navigate(-1)} variant="outline" className="tw-button">
          <ArrowLeft className="tw-mr-2 tw-h-4 tw-w-4" /> Back
        </Button>
        <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-text-foreground">Feedback Details</h1>
        <div className="tw-w-24"></div> {/* Spacer to balance header */}
      </div>
      
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardHeader>
          <CardTitle className="tw-xl tw-font-bold tw-text-foreground">Subject: {feedback.subject || 'No Subject'}</CardTitle>
          <CardDescription className="tw-text-muted-foreground">
            Submitted on {format(new Date(feedback.created_at!), 'MMM dd, yyyy, hh:mm a')}
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-space-y-6">
          <div>
            <p className="tw-font-semibold tw-text-foreground tw-mb-1">Submitted By:</p>
            <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-foreground tw-p-2 tw-bg-muted/20 tw-rounded-md">
              <User className="tw-h-4 tw-w-4" aria-hidden="true" />
              <span>{feedback.profiles?.[0]?.username || 'Anonymous'}</span>
            </div>
          </div>

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
                  <XCircle className="tw-h-4 tw-w-4 tw-text-destructive tw-inline-block tw-ml-1" aria-label="No" />
                )}
              </span>
            </div>
          </div>

          <Button variant="destructive" onClick={handleDelete} disabled={deleting || loading} className="tw-w-full">
            {deleting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
            <Trash2 className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Delete Feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackDetailPage;
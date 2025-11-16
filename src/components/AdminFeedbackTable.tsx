"use client";

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Search, Loader2, CheckCircle2, XCircle, Trash2, Eye } from 'lucide-react';
import { handleError } from '@/utils/errorHandler';
import { AnalyticsService } from '@/services/AnalyticsService';
import { FeedbackWithProfile } from '@/types/supabase';
import { FeedbackService } from '@/services/FeedbackService'; // Import the new service
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const AdminFeedbackTable: React.FC = () => {
  const [feedback, setFeedback] = useState<FeedbackWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await FeedbackService.fetchAllFeedback();
      setFeedback(data);
      AnalyticsService.trackEvent({ name: 'admin_feedback_table_loaded', properties: { count: data.length } });
    } catch (err) {
      setError(handleError(err, 'Failed to load feedback. Please try again.'));
      AnalyticsService.trackEvent({ name: 'admin_feedback_table_load_failed', properties: { error: (err as Error).message } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleViewDetails = (id: string) => {
    navigate(`/admin/feedback/${id}`); // Navigate to the new FeedbackDetailPage
    AnalyticsService.trackEvent({ name: 'admin_feedback_view_details_navigated', properties: { feedbackId: id } });
  };

  const handleDelete = async (feedbackId: string) => {
    if (window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        const success = await FeedbackService.deleteFeedback(feedbackId);
        if (success) {
          fetchFeedback(); // Re-fetch to update the table
          AnalyticsService.trackEvent({ name: 'admin_feedback_deleted_from_table', properties: { feedbackId } });
        } else {
          handleError(null, 'Failed to delete feedback.');
          AnalyticsService.trackEvent({ name: 'admin_feedback_delete_failed_from_table', properties: { feedbackId } });
        }
      } catch (err) {
        handleError(err, 'An error occurred while deleting feedback.');
        AnalyticsService.trackEvent({ name: 'admin_feedback_delete_error_from_table', properties: { feedbackId, error: (err as Error).message } });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const filteredFeedback = feedback.filter(entry =>
    (entry.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (entry.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (entry.profiles?.[0]?.username?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  const handleRetry = () => {
    setError(null);
    fetchFeedback();
    AnalyticsService.trackEvent({ name: 'admin_feedback_table_retry_fetch' });
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (error) {
    return (
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-8">
        <p className="tw-text-destructive tw-mb-4">Error: {error}</p>
        <Button onClick={handleRetry}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="tw-space-y-4">
      <div className="tw-relative tw-w-full">
        <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-h-4 tw-w-4 tw-text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search feedback..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="tw-pl-10 tw-w-full"
          aria-label="Search feedback entries"
        />
      </div>

      {loading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading feedback" />
        </div>
      ) : (
        <div className="tw-border tw-rounded-md tw-overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw-whitespace-nowrap">Date</TableHead>
                <TableHead className="tw-min-w-[120px]">User</TableHead>
                <TableHead className="tw-min-w-[150px]">Subject</TableHead>
                <TableHead className="tw-min-w-[250px]">Description</TableHead> {/* Truncated message */}
                <TableHead className="tw-whitespace-nowrap">Email</TableHead>
                <TableHead className="tw-whitespace-nowrap">Phone</TableHead>
                <TableHead className="tw-text-center tw-whitespace-nowrap">Contact?</TableHead>
                <TableHead className="tw-text-right tw-whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedback.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="tw-h-24 tw-text-center tw-text-muted-foreground">
                    {searchTerm ? 'No feedback matches your search.' : 'No feedback found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFeedback.map((entry) => (
                  <TableRow key={entry.id} className="tw-break-words hover:tw-bg-muted/50">
                    <TableCell className="tw-font-medium tw-whitespace-nowrap">
                      {format(new Date(entry.created_at!), 'MMM dd, yyyy, hh:mm a')}
                    </TableCell>
                    <TableCell>
                      {entry.profiles?.[0]?.username || 'Anonymous'}
                    </TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{entry.subject || '-'}</TableCell>
                    <TableCell className="tw-max-w-xs">{truncateMessage(entry.message)}</TableCell> {/* Truncated message */}
                    <TableCell className="tw-whitespace-nowrap">{entry.contact_email || '-'}</TableCell>
                    <TableCell className="tw-whitespace-nowrap">{entry.contact_phone || '-'}</TableCell>
                    <TableCell className="tw-text-center">
                      {entry.allow_contact ? (
                        <CheckCircle2 className="tw-h-5 tw-w-5 tw-text-green-500 tw-mx-auto" aria-label="User wishes to be contacted" />
                      ) : (
                        <XCircle className="tw-h-5 tw-w-5 tw-text-destructive tw-mx-auto" aria-label="User does not wish to be contacted" />
                      )}
                    </TableCell>
                    <TableCell className="tw-text-right tw-whitespace-nowrap">
                      <div className="tw-flex tw-justify-end tw-gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleViewDetails(entry.id)}
                          className="tw-h-8 tw-w-8"
                          aria-label={`View details for feedback from ${entry.profiles?.[0]?.username || 'Anonymous'}`}
                          disabled={isDeleting}
                        >
                          <Eye className="tw-h-4 tw-w-4" aria-hidden="true" />
                          <span className="tw-sr-only">View</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(entry.id)}
                          className="tw-h-8 tw-w-8"
                          aria-label={`Delete feedback from ${entry.profiles?.[0]?.username || 'Anonymous'}`}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" /> : <Trash2 className="tw-h-4 tw-w-4 tw-text-destructive" aria-hidden="true" />}
                          <span className="tw-sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackTable;
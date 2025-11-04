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
import { Search, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { AnalyticsService } from '@/services/AnalyticsService';
import { FeedbackWithProfile } from '@/types/database'; // Import new type

const AdminFeedbackTable: React.FC = () => {
  const [feedback, setFeedback] = useState<FeedbackWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('feedback_and_suggestions')
        .select(`
          id,
          user_id,
          subject,
          message,
          contact_email,
          contact_phone,
          allow_contact,
          created_at,
          profiles (username, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setFeedback(data as FeedbackWithProfile[]);
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

  const filteredFeedback = feedback.filter(entry =>
    (entry.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (entry.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (entry.profiles?.[0]?.username?.toLowerCase().includes(searchTerm.toLowerCase()) || '') || // Access first element of profiles array
    (entry.profiles?.[0]?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '') // Access first element of profiles array
  );

  const handleRetry = () => {
    setError(null);
    fetchFeedback();
    AnalyticsService.trackEvent({ name: 'admin_feedback_table_retry_fetch' });
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
                <TableHead className="tw-min-w-[250px]">Message</TableHead>
                <TableHead className="tw-whitespace-nowrap">Email</TableHead>
                <TableHead className="tw-whitespace-nowrap">Phone</TableHead>
                <TableHead className="tw-text-center tw-whitespace-nowrap">Contact?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedback.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="tw-h-24 tw-text-center tw-text-muted-foreground">
                    {searchTerm ? 'No feedback matches your search.' : 'No feedback found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFeedback.map((entry) => (
                  <TableRow key={entry.id} className="tw-break-words">
                    <TableCell className="tw-font-medium tw-whitespace-nowrap">
                      {format(new Date(entry.created_at), 'MMM dd, yyyy, hh:mm a')}
                    </TableCell>
                    <TableCell>
                      {entry.profiles?.[0]?.username || entry.profiles?.[0]?.email || 'Anonymous'}
                    </TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{entry.subject || '-'}</TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{entry.message}</TableCell>
                    <TableCell className="tw-whitespace-nowrap">{entry.contact_email || '-'}</TableCell>
                    <TableCell className="tw-whitespace-nowrap">{entry.contact_phone || '-'}</TableCell>
                    <TableCell className="tw-text-center">
                      {entry.allow_contact ? (
                        <CheckCircle2 className="tw-h-5 tw-w-5 tw-text-green-500 tw-mx-auto" aria-label="User wishes to be contacted" />
                      ) : (
                        <XCircle className="tw-h-5 tw-w-5 tw-text-destructive tw-mx-auto" aria-label="User does not wish to be contacted" />
                      )}
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
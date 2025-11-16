"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from './AnalyticsService';
import { FeedbackRow, FeedbackWithProfile } from '@/types/supabase';

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
  if (import.meta.env.DEV) {
    console.error(`Supabase Error in ${functionName}:`, error);
  }
};

export const FeedbackService = {
  async fetchAllFeedback(): Promise<FeedbackWithProfile[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

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
          profiles (username, id)
        `)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('fetchAllFeedback', error);
        AnalyticsService.trackEvent({ name: 'fetch_all_feedback_failed', properties: { error: error.message } });
        throw error;
      }
      AnalyticsService.trackEvent({ name: 'all_feedback_fetched', properties: { count: data.length } });
      return data as FeedbackWithProfile[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching all feedback timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_all_feedback_timeout' });
        throw new Error('Fetching all feedback timed out.');
      } else {
        logSupabaseError('fetchAllFeedback', err);
        AnalyticsService.trackEvent({ name: 'fetch_all_feedback_unexpected_error', properties: { error: err.message } });
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchFeedbackById(feedbackId: string): Promise<FeedbackWithProfile | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

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
          profiles (username, id)
        `)
        .eq('id', feedbackId)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          AnalyticsService.trackEvent({ name: 'fetch_feedback_by_id_not_found', properties: { feedbackId } });
          return null;
        }
        logSupabaseError('fetchFeedbackById', error);
        AnalyticsService.trackEvent({ name: 'fetch_feedback_by_id_failed', properties: { feedbackId, error: error.message } });
        throw error;
      }
      AnalyticsService.trackEvent({ name: 'feedback_by_id_fetched', properties: { feedbackId } });
      return data as FeedbackWithProfile;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching feedback by ID timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_feedback_by_id_timeout', properties: { feedbackId } });
        throw new Error('Fetching feedback by ID timed out.');
      } else {
        logSupabaseError('fetchFeedbackById', err);
        AnalyticsService.trackEvent({ name: 'fetch_feedback_by_id_unexpected_error', properties: { feedbackId, error: err.message } });
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async deleteFeedback(feedbackId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('feedback_and_suggestions')
        .delete()
        .eq('id', feedbackId)
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('deleteFeedback', error);
        AnalyticsService.trackEvent({ name: 'delete_feedback_failed', properties: { feedbackId, error: error.message } });
        throw error;
      }
      AnalyticsService.trackEvent({ name: 'feedback_deleted', properties: { feedbackId } });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Deleting feedback timed out.');
        AnalyticsService.trackEvent({ name: 'delete_feedback_timeout', properties: { feedbackId } });
        throw new Error('Deleting feedback timed out.');
      } else {
        logSupabaseError('deleteFeedback', err);
        AnalyticsService.trackEvent({ name: 'delete_feedback_unexpected_error', properties: { feedbackId, error: err.message } });
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
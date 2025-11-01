"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: string;
  location: string;
  date: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  admin_id?: string;
  created_at: string;
}

export interface IncidentFilter {
  searchTerm?: string;
  type?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

export const INCIDENTS_PER_PAGE = 10;

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
  if (import.meta.env.DEV) {
    console.error(`Supabase Error in ${functionName}:`, error);
  }
};

export const IncidentService = {
  INCIDENTS_PER_PAGE,

  async fetchIncidents(offset: number = 0, filters: IncidentFilter = {}): Promise<Incident[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      let query = supabase
        .from('incidents')
        .select('id, title, description, type, location, date, image_url, latitude, longitude, admin_id, created_at')
        .abortSignal(controller.signal);

      if (filters.searchTerm) {
        query = query.textSearch('search_vector', filters.searchTerm, {
          type: 'websearch',
          config: 'english',
        });
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate + 'T23:59:59.999Z');
      }

      query = query
        .order('date', { ascending: false })
        .range(offset, offset + INCIDENTS_PER_PAGE - 1);

      const { data, error } = await query;

      if (error) {
        logSupabaseError('fetchIncidents', error);
        AnalyticsService.trackEvent({ name: 'fetch_incidents_failed', properties: { offset, filters, error: error.message } });
        return [];
      }
      AnalyticsService.trackEvent({ name: 'incidents_fetched', properties: { offset, filters, count: data.length } });
      return data as Incident[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching incidents timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_incidents_timeout', properties: { offset, filters } });
      } else {
        logSupabaseError('fetchIncidents', err);
        AnalyticsService.trackEvent({ name: 'fetch_incidents_unexpected_error', properties: { offset, filters, error: err.message } });
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchSingleIncident(incidentId: string): Promise<Incident | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, title, description, type, location, date, image_url, latitude, longitude, admin_id, created_at')
        .eq('id', incidentId)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          AnalyticsService.trackEvent({ name: 'fetch_single_incident_not_found', properties: { incidentId } });
          return null;
        }
        logSupabaseError('fetchSingleIncident', error);
        AnalyticsService.trackEvent({ name: 'fetch_single_incident_failed', properties: { incidentId, error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'single_incident_fetched', properties: { incidentId } });
      return data as Incident;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching single incident timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_single_incident_timeout', properties: { incidentId } });
      } else {
        logSupabaseError('fetchSingleIncident', err);
        AnalyticsService.trackEvent({ name: 'fetch_single_incident_unexpected_error', properties: { incidentId, error: err.message } });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchNewIncidents(lastTimestamp: string): Promise<Incident[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .gt('date', lastTimestamp)
        .abortSignal(controller.signal)
        .order('date', { ascending: false });

      if (error) {
        logSupabaseError('fetchNewIncidents', error);
        AnalyticsService.trackEvent({ name: 'fetch_new_incidents_failed', properties: { lastTimestamp, error: error.message } });
        return [];
      }
      AnalyticsService.trackEvent({ name: 'new_incidents_fetched', properties: { lastTimestamp, count: data.length } });
      return data as Incident[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching new incidents timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_new_incidents_timeout', properties: { lastTimestamp } });
      } else {
        logSupabaseError('fetchNewIncidents', err);
        AnalyticsService.trackEvent({ name: 'fetch_new_incidents_unexpected_error', properties: { lastTimestamp, error: err.message } });
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async createIncident(incident: Omit<Incident, 'id' | 'created_at' | 'image_url'>, imageFile: File | null, latitude: number | undefined, longitude: number | undefined, adminId: string): Promise<Incident | null> {
    if (import.meta.env.DEV) {
      console.log('IncidentService: Starting createIncident for adminId:', adminId);
      console.log('Incident data:', incident);
      console.log('Image file present:', !!imageFile);
      console.log('Latitude:', latitude, 'Longitude:', longitude);
    }

    let imageUrl: string | null = null;
    if (imageFile) {
      if (import.meta.env.DEV) {
        console.log('IncidentService: Attempting to upload incident image.');
      }
      imageUrl = await StorageService.uploadIncidentImage(imageFile);
      if (!imageUrl) {
        if (import.meta.env.DEV) {
          console.error('IncidentService: Image upload failed.');
        }
        AnalyticsService.trackEvent({ name: 'create_incident_image_upload_failed', properties: { adminId, type: incident.type } });
        return null;
      }
      if (import.meta.env.DEV) {
        console.log('IncidentService: Image uploaded successfully. URL:', imageUrl);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      if (import.meta.env.DEV) {
        console.error('IncidentService: createIncident Supabase insert timed out.');
      }
    }, SUPABASE_API_TIMEOUT);

    try {
      if (import.meta.env.DEV) {
        console.log('IncidentService: Attempting to insert incident into Supabase.');
      }
      const { data, error } = await supabase
        .from('incidents')
        .insert({ ...incident, image_url: imageUrl, latitude, longitude, admin_id: adminId })
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.error('IncidentService: Supabase insert error:', error);
        }
        logSupabaseError('createIncident', error);
        AnalyticsService.trackEvent({ name: 'create_incident_failed', properties: { adminId, type: incident.type, error: error.message } });
        return null;
      }

      if (data) {
        if (import.meta.env.DEV) {
          console.log('IncidentService: Incident inserted successfully. Data:', data);
          console.log('IncidentService: Attempting to create alert notification.');
        }
        await NotificationService.createAlert({
          title: data.title,
          description: data.description,
          type: data.type,
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
        });
        AnalyticsService.trackEvent({ name: 'incident_created', properties: { incidentId: data.id, adminId, type: data.type } });
        if (import.meta.env.DEV) {
          console.log('IncidentService: Alert notification created.');
        }
      }

      return data as Incident;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Creating incident timed out.');
        AnalyticsService.trackEvent({ name: 'create_incident_timeout', properties: { adminId, type: incident.type } });
      } else {
        logSupabaseError('createIncident', err);
        AnalyticsService.trackEvent({ name: 'create_incident_unexpected_error', properties: { adminId, type: incident.type, error: err.message } });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      if (import.meta.env.DEV) {
        console.log('IncidentService: createIncident finished.');
      }
    }
  },

  async updateIncident(id: string, updates: Partial<Omit<Incident, 'id' | 'created_at' | 'admin_id'>>, imageFile: File | null, currentImageUrl: string | undefined, latitude: number | undefined, longitude: number | undefined): Promise<Incident | null> {
    let imageUrl: string | undefined = currentImageUrl;

    if (imageFile) {
      const newImageUrl = await StorageService.uploadIncidentImage(imageFile);
      if (!newImageUrl) {
        AnalyticsService.trackEvent({ name: 'update_incident_image_upload_failed', properties: { incidentId: id } });
        return null;
      }
      if (currentImageUrl) {
        await StorageService.deleteIncidentImage(currentImageUrl);
      }
      imageUrl = newImageUrl;
    } else if (currentImageUrl && !imageFile) {
      await StorageService.deleteIncidentImage(currentImageUrl);
      imageUrl = undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('incidents')
        .update({ ...updates, image_url: imageUrl, latitude, longitude, date: new Date().toISOString() })
        .eq('id', id)
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('updateIncident', error);
        AnalyticsService.trackEvent({ name: 'update_incident_failed', properties: { incidentId: id, updates: Object.keys(updates), error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'incident_updated', properties: { incidentId: id, updates: Object.keys(updates) } });
      return data as Incident;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating incident timed out.');
        AnalyticsService.trackEvent({ name: 'update_incident_timeout', properties: { incidentId: id } });
      } else {
        logSupabaseError('updateIncident', err);
        AnalyticsService.trackEvent({ name: 'update_incident_unexpected_error', properties: { incidentId: id, error: err.message } });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async deleteIncident(id: string, imageUrl: string | undefined): Promise<boolean> {
    if (imageUrl) {
      await StorageService.deleteIncidentImage(imageUrl);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', id)
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('deleteIncident', error);
        AnalyticsService.trackEvent({ name: 'delete_incident_failed', properties: { incidentId: id, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'incident_deleted', properties: { incidentId: id } });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Deleting incident timed out.');
        AnalyticsService.trackEvent({ name: 'delete_incident_timeout', properties: { incidentId: id } });
      } else {
        logSupabaseError('deleteIncident', err);
        AnalyticsService.trackEvent({ name: 'delete_incident_unexpected_error', properties: { incidentId: id, error: err.message } });
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchSubscriberCount(): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .in('subscription_status', ['trialing', 'active'])
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('fetchSubscriberCount', error);
        AnalyticsService.trackEvent({ name: 'fetch_subscriber_count_failed', properties: { error: error.message } });
        return 0;
      }
      AnalyticsService.trackEvent({ name: 'subscriber_count_fetched', properties: { count: count || 0 } });
      return count || 0;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching subscriber count timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_subscriber_count_timeout' });
      } else {
        logSupabaseError('fetchSubscriberCount', err);
        AnalyticsService.trackEvent({ name: 'fetch_subscriber_count_unexpected_error', properties: { error: err.message } });
      }
      return 0;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchPreviousIncident(currentIncidentTimestamp: string): Promise<Incident | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, title, description, type, location, date, image_url, latitude, longitude, admin_id, created_at')
        .lt('date', currentIncidentTimestamp)
        .order('date', { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          AnalyticsService.trackEvent({ name: 'fetch_previous_incident_not_found', properties: { currentIncidentTimestamp } });
          return null;
        }
        logSupabaseError('fetchPreviousIncident', error);
        AnalyticsService.trackEvent({ name: 'fetch_previous_incident_failed', properties: { currentIncidentTimestamp, error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'previous_incident_fetched', properties: { incidentId: data.id } });
      return data as Incident;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching previous incident timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_previous_incident_timeout', properties: { currentIncidentTimestamp } });
      } else {
        logSupabaseError('fetchPreviousIncident', err);
        AnalyticsService.trackEvent({ name: 'fetch_previous_incident_unexpected_error', properties: { currentIncidentTimestamp, error: err.message } });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
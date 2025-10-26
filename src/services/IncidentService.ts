import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { StorageService } from './StorageService'; // Import StorageService

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
  admin_id?: string; // Added admin_id
  created_at: string;
}

export interface IncidentFilter {
  searchTerm?: string;
  type?: string;
  location?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export const INCIDENTS_PER_PAGE = 10;

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

export const IncidentService = {
  INCIDENTS_PER_PAGE,

  async fetchIncidents(offset: number = 0, filters: IncidentFilter = {}): Promise<Incident[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      let query = supabase
        .from('incidents')
        .select('*')
        .abortSignal(controller.signal);

      // Apply filters
      if (filters.searchTerm) {
        // Use websearch_to_tsquery for more flexible search syntax
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
        query = query.lte('date', filters.endDate + 'T23:59:59.999Z'); // End of day
      }

      query = query
        .order('date', { ascending: false })
        .range(offset, offset + INCIDENTS_PER_PAGE - 1); // Use INCIDENTS_PER_PAGE for limit

      const { data, error } = await query;

      if (error) {
        logSupabaseError('fetchIncidents', error);
        return [];
      }
      return data as Incident[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching incidents timed out.');
      } else {
        logSupabaseError('fetchIncidents', err);
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
        .select('*')
        .eq('id', incidentId)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logSupabaseError('fetchSingleIncident', error);
        return null;
      }
      return data as Incident;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching single incident timed out.');
      } else {
        logSupabaseError('fetchSingleIncident', err);
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
        return [];
      }
      return data as Incident[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching new incidents timed out.');
      } else {
        logSupabaseError('fetchNewIncidents', err);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async createIncident(incident: Omit<Incident, 'id' | 'created_at' | 'image_url'>, imageFile: File | null, latitude: number | undefined, longitude: number | undefined, adminId: string): Promise<Incident | null> {
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await StorageService.uploadIncidentImage(imageFile);
      if (!imageUrl) return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('incidents')
        .insert({ ...incident, image_url: imageUrl, latitude, longitude, admin_id: adminId })
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('createIncident', error);
        return null;
      }
      return data as Incident;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Creating incident timed out.');
      } else {
        logSupabaseError('createIncident', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async updateIncident(id: string, updates: Partial<Omit<Incident, 'id' | 'created_at' | 'admin_id'>>, imageFile: File | null, currentImageUrl: string | undefined, latitude: number | undefined, longitude: number | undefined): Promise<Incident | null> {
    let imageUrl: string | undefined = currentImageUrl;

    if (imageFile) {
      const newImageUrl = await StorageService.uploadIncidentImage(imageFile);
      if (!newImageUrl) return null;
      if (currentImageUrl) {
        await StorageService.deleteIncidentImage(currentImageUrl);
      }
      imageUrl = newImageUrl;
    } else if (currentImageUrl && !imageFile) {
      // If currentImageUrl exists but no new file is provided and image is explicitly removed
      await StorageService.deleteIncidentImage(currentImageUrl);
      imageUrl = undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('incidents')
        .update({ ...updates, image_url: imageUrl, latitude, longitude, date: new Date().toISOString() }) // Update date to current time on edit
        .eq('id', id)
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('updateIncident', error);
        return null;
      }
      return data as Incident;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating incident timed out.');
      } else {
        logSupabaseError('updateIncident', err);
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
        return false;
      }
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Deleting incident timed out.');
      } else {
        logSupabaseError('deleteIncident', err);
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
        return 0;
      }
      return count || 0;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching subscriber count timed out.');
      } else {
        logSupabaseError('fetchSubscriberCount', err);
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
        .select('*')
        .lt('date', currentIncidentTimestamp)
        .order('date', { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logSupabaseError('fetchPreviousIncident', error);
        return null;
      }
      return data as Incident;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching previous incident timed out.');
      } else {
        logSupabaseError('fetchPreviousIncident', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
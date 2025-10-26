import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: string;
  location: string;
  date: string;
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

  async createIncident(incident: Omit<Incident, 'id' | 'created_at'>): Promise<Incident | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('incidents')
        .insert(incident)
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
};
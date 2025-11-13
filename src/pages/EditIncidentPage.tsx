"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IncidentService, Incident } from '@/services/IncidentService';
import IncidentForm from '@/components/IncidentForm';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { handleError } from '@/utils/errorHandler';
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService';

const EditIncidentPage: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncident = async () => {
      if (!incidentId) {
        setError('Incident ID is missing.');
        setLoading(false);
        AnalyticsService.trackEvent({ name: 'edit_incident_page_load_failed', properties: { reason: 'missing_id' } });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const fetchedIncident = await IncidentService.fetchSingleIncident(incidentId);
        if (fetchedIncident) {
          setIncident(fetchedIncident);
          AnalyticsService.trackEvent({ name: 'edit_incident_page_loaded', properties: { incidentId } });
        } else {
          setError(handleError(null, 'Incident not found.'));
          AnalyticsService.trackEvent({ name: 'edit_incident_page_load_failed', properties: { incidentId, reason: 'not_found' } });
        }
      } catch (err) {
        setError(handleError(err, 'An unexpected error occurred while loading the incident.'));
        AnalyticsService.trackEvent({ name: 'edit_incident_page_load_failed', properties: { incidentId, reason: 'unexpected_error', error: (err as Error).message } });
      } finally {
        setLoading(false);
      }
    };

    fetchIncident();
  }, [incidentId]);

  const handleUpdateIncident = async (type: string, location: string, description: string, imageFile: File | null, currentImageUrl: string | null, latitude: number | undefined, longitude: number | undefined): Promise<boolean> => {
    if (!incidentId) {
      toast.error('Incident ID is missing for update.');
      return false;
    }

    setIsSubmitting(true);
    try {
      toast.loading('Updating incident...', { id: 'update-incident' });
      const title = `${type} at ${location}`;
      const updatedIncident = await IncidentService.updateIncident(incidentId, {
        title,
        type,
        location,
        description,
        date: incident?.date, // Preserve original date
      }, imageFile, currentImageUrl, latitude, longitude);
      
      if (updatedIncident) {
        toast.success('Incident updated successfully!', { id: 'update-incident' });
        AnalyticsService.trackEvent({ name: 'incident_updated_from_edit_page', properties: { incidentId: updatedIncident.id } });
        navigate(-1); // Go back to the previous page (Admin Table or Incident Detail)
        return true;
      } else {
        toast.error('Failed to update incident.', { id: 'update-incident' });
        AnalyticsService.trackEvent({ name: 'incident_update_failed_from_edit_page', properties: { incidentId } });
        return false;
      }
    } catch (err) {
      handleError(err, 'An error occurred while updating the incident.', { id: 'update-incident' });
      AnalyticsService.trackEvent({ name: 'incident_update_error_from_edit_page', properties: { incidentId, error: (err as Error).message } });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading incident for editing" />
        <p className="tw-ml-2">Loading incident for editing...</p>
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

  if (!incident) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-foreground tw-mb-4">Incident Not Found</h1>
          <p className="tw-text-muted-foreground">The incident you are trying to edit does not exist.</p>
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
        <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-text-foreground">Edit Incident</h1>
        <div className="tw-w-24"></div> {/* Spacer to balance header */}
      </div>
      
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardHeader>
          <CardTitle className="tw-xl tw-font-bold tw-text-foreground">Editing: {incident.title}</CardTitle>
          <CardDescription className="tw-text-muted-foreground">Update the details of this incident.</CardDescription>
        </CardHeader>
        <CardContent>
          <IncidentForm
            formId="edit-incident-form"
            onSubmit={handleUpdateIncident}
            isLoading={isSubmitting}
            initialIncident={incident}
          />
          <div className="tw-mt-6">
            <Button 
              type="submit" 
              form="edit-incident-form"
              disabled={isSubmitting} 
              className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground"
            >
              {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditIncidentPage;
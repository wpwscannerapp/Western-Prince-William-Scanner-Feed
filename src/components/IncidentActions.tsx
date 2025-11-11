"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import IncidentForm from './IncidentForm';
import { IncidentRow } from '@/types/supabase';
import { IncidentService } from '@/services/IncidentService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AnalyticsService } from '@/services/AnalyticsService';
import { handleError } from '@/utils/errorHandler';

interface IncidentActionsProps {
  incident: IncidentRow;
  onActionComplete: () => void; // Callback to refresh parent list/detail view
}

const IncidentActions: React.FC<IncidentActionsProps> = ({ incident, onActionComplete }) => {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateIncident = async (type: string, location: string, description: string, imageFile: File | null, currentImageUrl: string | null, latitude: number | undefined, longitude: number | undefined): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      toast.loading('Updating incident...', { id: 'update-incident-action' });
      const title = `${type} at ${location}`;
      const updatedIncident = await IncidentService.updateIncident(incident.id, {
        title,
        type,
        location,
        description,
        date: incident.date,
      }, imageFile, currentImageUrl, latitude, longitude);
      
      if (updatedIncident) {
        toast.success('Incident updated successfully!', { id: 'update-incident-action' });
        setIsEditDialogOpen(false);
        
        // Invalidate queries for global update
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        queryClient.invalidateQueries({ queryKey: ['incidents', 'latest'] });
        queryClient.invalidateQueries({ queryKey: ['incidents', 'archive'] });
        queryClient.invalidateQueries({ queryKey: ['incidents', updatedIncident.id] });
        onActionComplete();
        
        AnalyticsService.trackEvent({ name: 'admin_incident_updated_from_action', properties: { incidentId: updatedIncident.id } });
        return true;
      } else {
        toast.error('Failed to update incident.', { id: 'update-incident-action' });
        AnalyticsService.trackEvent({ name: 'admin_incident_update_failed_from_action', properties: { incidentId: incident.id } });
        return false;
      }
    } catch (err) {
      handleError(err, 'An error occurred while updating the incident.');
      AnalyticsService.trackEvent({ name: 'admin_incident_update_error_from_action', properties: { incidentId: incident.id, error: (err as Error).message } });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    if (window.confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        toast.loading('Deleting incident...', { id: 'delete-incident-action' });
        const success = await IncidentService.deleteIncident(incident.id, incident.image_url || undefined);
        if (success) {
          toast.success('Incident deleted successfully!', { id: 'delete-incident-action' });
          
          // Invalidate and remove queries for global update
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
          queryClient.invalidateQueries({ queryKey: ['incidents', 'latest'] });
          queryClient.invalidateQueries({ queryKey: ['incidents', 'archive'] });
          queryClient.removeQueries({ queryKey: ['incidents', incident.id] });
          onActionComplete();
          
          AnalyticsService.trackEvent({ name: 'admin_incident_deleted_from_action', properties: { incidentId: incident.id } });
        } else {
          toast.error('Failed to delete incident.', { id: 'delete-incident-action' });
          AnalyticsService.trackEvent({ name: 'admin_incident_delete_failed_from_action', properties: { incidentId: incident.id } });
        }
      } catch (err) {
        toast.error('An error occurred while deleting the incident.', { id: 'delete-incident-action' });
        AnalyticsService.trackEvent({ name: 'admin_incident_delete_error_from_action', properties: { incidentId: incident.id, error: (err as Error).message } });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
      <div className="tw-flex tw-gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsEditDialogOpen(true); }}
          disabled={isDeleting}
          className="tw-h-8 tw-w-8 tw-p-0 tw-text-muted-foreground hover:tw-text-primary tw-button"
          aria-label={`Edit incident ${incident.title}`}
        >
          <Edit className="tw-h-4 tw-w-4" aria-hidden="true" />
          <span className="tw-sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="tw-h-8 tw-w-8 tw-p-0 tw-text-destructive hover:tw-text-destructive/80 tw-button"
          aria-label={`Delete incident ${incident.title}`}
        >
          {isDeleting ? <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" /> : <Trash2 className="tw-h-4 tw-w-4" aria-hidden="true" />}
          <span className="tw-sr-only">Delete</span>
        </Button>
      </div>

      {/* Admin Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:tw-max-w-lg md:tw-max-w-xl tw-max-h-[90vh] tw-overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Incident: {incident.title}</DialogTitle>
            <DialogDescription>Update the details, location, or image for this incident.</DialogDescription>
          </DialogHeader>
          <IncidentForm
            formId="edit-incident-action-form"
            onSubmit={handleUpdateIncident}
            isLoading={isSubmitting}
            initialIncident={incident}
          />
          <DialogFooter>
            <Button 
              type="submit" 
              form="edit-incident-action-form"
              disabled={isSubmitting} 
              className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground"
            >
              {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
              <Save className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IncidentActions;
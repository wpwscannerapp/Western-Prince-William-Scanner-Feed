"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react'; // Removed Save icon as it's no longer needed here
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { IncidentRow } from '@/types/supabase';
import { IncidentService } from '@/services/IncidentService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AnalyticsService } from '@/services/AnalyticsService';
// Removed: import { handleError } from '@/utils/errorHandler';

interface IncidentActionsProps {
  incident: IncidentRow;
  onActionComplete: () => void; // Callback to refresh parent list/detail view
}

const IncidentActions: React.FC<IncidentActionsProps> = ({ incident, onActionComplete }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // Initialize useNavigate
  const [isDeleting, setIsDeleting] = useState(false);

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
      } catch (err: any) {
        toast.error('An error occurred while deleting the incident.', { id: 'delete-incident-action' });
        AnalyticsService.trackEvent({ name: 'admin_incident_delete_error_from_action', properties: { incidentId: incident.id, error: err.message } });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    navigate(`/incidents/edit/${incident.id}`); // Navigate to the new edit page
    AnalyticsService.trackEvent({ name: 'admin_incident_edit_navigated_from_action', properties: { incidentId: incident.id } });
  };

  return (
    <>
      <div className="tw-flex tw-gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEditClick}
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
    </>
  );
};

export default IncidentActions;
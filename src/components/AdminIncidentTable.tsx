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
import { IncidentRow, IncidentListItem } from '@/types/supabase'; // Import IncidentRow, IncidentListItem
import { IncidentService } from '@/services/IncidentService';
import { format } from 'date-fns';
import { Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import IncidentForm from './IncidentForm';
import { AnalyticsService } from '@/services/AnalyticsService';
import { useQueryClient } from '@tanstack/react-query';

interface AdminIncidentTableProps {
  onIncidentUpdated: () => void;
}

const AdminIncidentTable: React.FC<AdminIncidentTableProps> = ({ onIncidentUpdated }) => {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]); // Use IncidentListItem
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIncident, setEditingIncident] = useState<IncidentRow | null>(null); // Use IncidentRow
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedIncidents = await IncidentService.fetchIncidents(0);
      setIncidents(fetchedIncidents);
      AnalyticsService.trackEvent({ name: 'admin_incident_table_loaded', properties: { count: fetchedIncidents.length } });
    } catch (err) {
      setError('Failed to load incidents. Please try again.');
      AnalyticsService.trackEvent({ name: 'admin_incident_table_load_failed', properties: { error: (err as Error).message } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleDelete = async (incidentId: string, imageUrl: string | undefined) => {
    if (window.confirm('Are you sure you want to delete this incident?')) {
      try {
        toast.loading('Deleting incident...', { id: 'delete-incident' });
        const success = await IncidentService.deleteIncident(incidentId, imageUrl);
        if (success) {
          toast.success('Incident deleted successfully!', { id: 'delete-incident' });
          // Invalidate and remove queries for global update
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
          queryClient.invalidateQueries({ queryKey: ['incidents', 'latest'] });
          queryClient.invalidateQueries({ queryKey: ['incidents', 'archive'] });
          queryClient.removeQueries({ queryKey: ['incidents', incidentId] }); // Remove specific incident detail cache
          fetchIncidents(); // Re-fetch for the admin table itself
          onIncidentUpdated(); // Notify parent component (AdminDashboardTabs)
          AnalyticsService.trackEvent({ name: 'admin_incident_deleted', properties: { incidentId } });
        } else {
          toast.error('Failed to delete incident.', { id: 'delete-incident' });
          AnalyticsService.trackEvent({ name: 'admin_incident_delete_failed', properties: { incidentId } });
        }
      } catch (err) {
        toast.error('An error occurred while deleting the incident.', { id: 'delete-incident' });
        AnalyticsService.trackEvent({ name: 'admin_incident_delete_error', properties: { incidentId, error: (err as Error).message } });
      }
    }
  };

  const handleEdit = (incident: IncidentRow) => { // Use IncidentRow
    if (import.meta.env.DEV) {
      console.log(`AdminIncidentTable: handleEdit called for incident ID: ${incident.id}. Setting isEditDialogOpen to true.`);
    }
    setEditingIncident(incident);
    setIsEditDialogOpen(true);
    AnalyticsService.trackEvent({ name: 'admin_incident_edit_opened', properties: { incidentId: incident.id } });
  };

  const handleUpdateIncident = async (type: string, location: string, description: string, imageFile: File | null, currentImageUrl: string | null, latitude: number | undefined, longitude: number | undefined): Promise<boolean> => {
    if (!editingIncident) return false;

    setIsSubmitting(true);
    try {
      toast.loading('Updating incident...', { id: 'update-incident' });
      const title = `${type} at ${location}`;
      const updatedIncident = await IncidentService.updateIncident(editingIncident.id, {
        title,
        type,
        location,
        description,
        date: editingIncident.date,
      }, imageFile, currentImageUrl, latitude, longitude);
      
      if (updatedIncident) {
        toast.success('Incident updated successfully!', { id: 'update-incident' });
        setIsEditDialogOpen(false);
        setEditingIncident(null);
        // Invalidate queries for global update
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        queryClient.invalidateQueries({ queryKey: ['incidents', 'latest'] });
        queryClient.invalidateQueries({ queryKey: ['incidents', 'archive'] });
        queryClient.invalidateQueries({ queryKey: ['incidents', updatedIncident.id] }); // Invalidate specific incident detail cache
        fetchIncidents(); // Re-fetch for the admin table itself
        onIncidentUpdated(); // Notify parent component (AdminDashboardTabs)
        AnalyticsService.trackEvent({ name: 'admin_incident_updated', properties: { incidentId: updatedIncident.id } });
        return true;
      } else {
        toast.error('Failed to update incident.', { id: 'update-incident' });
        AnalyticsService.trackEvent({ name: 'admin_incident_update_failed', properties: { incidentId: editingIncident.id } });
        return false;
      }
    } catch (err) {
      toast.error('An error occurred while updating the incident.', { id: 'update-incident' });
      AnalyticsService.trackEvent({ name: 'admin_incident_update_error', properties: { incidentId: editingIncident.id, error: (err as Error).message } });
      return false; // Explicitly return false on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRetry = () => {
    setError(null);
    fetchIncidents();
    AnalyticsService.trackEvent({ name: 'admin_incident_table_retry_fetch' });
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`AdminIncidentTable: isEditDialogOpen state changed to: ${isEditDialogOpen}`);
    }
  }, [isEditDialogOpen]);

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
          placeholder="Search incidents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="tw-pl-10 tw-w-full"
          aria-label="Search incidents"
        />
      </div>

      {loading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading incidents" />
        </div>
      ) : (
        <div className="tw-border tw-rounded-md tw-overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw-whitespace-nowrap">Date</TableHead>
                <TableHead className="tw-min-w-[150px]">Title</TableHead>
                <TableHead className="tw-whitespace-nowrap">Type</TableHead>
                <TableHead className="tw-whitespace-nowrap">Location</TableHead>
                <TableHead className="tw-min-w-[200px]">Description</TableHead>
                <TableHead className="tw-whitespace-nowrap">Image</TableHead>
                <TableHead className="tw-text-right tw-whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="tw-h-24 tw-text-center tw-text-muted-foreground">
                    {searchTerm ? 'No incidents match your search.' : 'No incidents found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((incident) => (
                  <TableRow key={incident.id} className="tw-break-words">
                    <TableCell className="tw-font-medium tw-whitespace-nowrap">
                      {format(new Date(incident.date!), 'MMM dd, yyyy, hh:mm a')}
                    </TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{incident.title}</TableCell>
                    <TableCell className="tw-whitespace-nowrap">{incident.type}</TableCell>
                    <TableCell className="tw-whitespace-nowrap">{incident.location}</TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{incident.description}</TableCell>
                    <TableCell>
                      {incident.image_url ? (
                        <img 
                          src={incident.image_url} 
                          alt={`Incident image for ${incident.title}`}
                          className="tw-h-10 tw-w-10 tw-object-cover tw-rounded-md" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.parentElement!.innerHTML = '<span class="tw-text-muted-foreground">Image</span>';
                            AnalyticsService.trackEvent({ name: 'admin_incident_image_load_failed', properties: { incidentId: incident.id, imageUrl: incident.image_url } });
                          }}
                        />
                      ) : (
                        <span className="tw-text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="tw-text-right tw-whitespace-nowrap">
                      <div className="tw-flex tw-justify-end tw-gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(incident as IncidentRow)}
                          className="tw-h-8 tw-w-8"
                          aria-label={`Edit incident ${incident.title}`}
                        >
                          <Edit className="tw-h-4 tw-w-4" aria-hidden="true" />
                          <span className="tw-sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(incident.id, incident.image_url || undefined)}
                          className="tw-h-8 tw-w-8"
                          aria-label={`Delete incident ${incident.title}`}
                        >
                          <Trash2 className="tw-h-4 tw-w-4 tw-text-destructive" aria-hidden="true" />
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

      {editingIncident && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (import.meta.env.DEV) {
            console.log(`AdminIncidentTable: Dialog onOpenChange called. New state: ${open}`);
          }
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingIncident(null); // Clear editing incident when dialog closes
          }
        }}>
          <DialogContent key={editingIncident.id} className="sm:tw-max-w-lg md:tw-max-w-xl tw-max-h-[90vh] tw-overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Incident</DialogTitle>
              <DialogDescription>Update the details, location, or image for this incident.</DialogDescription>
            </DialogHeader>
            <IncidentForm
              formId="edit-incident-form"
              onSubmit={handleUpdateIncident}
              isLoading={isSubmitting}
              initialIncident={editingIncident}
            />
            <DialogFooter>
              <Button 
                type="submit" 
                form="edit-incident-form"
                disabled={isSubmitting} 
                className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground"
              >
                {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
                Update Incident
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminIncidentTable;
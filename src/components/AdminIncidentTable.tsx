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
import { Incident, IncidentService } from '@/services/IncidentService';
import { format } from 'date-fns';
import { Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import IncidentForm from './IncidentForm';

interface AdminIncidentTableProps {
  onIncidentUpdated: () => void;
}

const AdminIncidentTable: React.FC<AdminIncidentTableProps> = ({ onIncidentUpdated }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedIncidents = await IncidentService.fetchIncidents(0);
      setIncidents(fetchedIncidents);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load incidents. Please try again.');
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
          fetchIncidents();
          onIncidentUpdated();
        } else {
          toast.error('Failed to delete incident.', { id: 'delete-incident' });
        }
      } catch (err) {
        console.error('Error deleting incident:', err);
        toast.error('An error occurred while deleting the incident.', { id: 'delete-incident' });
      }
    }
  };

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setIsEditDialogOpen(true);
  };

  const handleUpdateIncident = async (type: string, location: string, description: string, imageFile: File | null, currentImageUrl: string | undefined, latitude: number | undefined, longitude: number | undefined) => {
    console.log('AdminIncidentTable: handleUpdateIncident called.'); // Added log
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
        date: editingIncident.date, // Keep original date or update if needed
      }, imageFile, currentImageUrl, latitude, longitude);
      
      if (updatedIncident) {
        toast.success('Incident updated successfully!', { id: 'update-incident' });
        setIsEditDialogOpen(false);
        setEditingIncident(null);
        fetchIncidents();
        onIncidentUpdated();
        return true;
      } else {
        toast.error('Failed to update incident.', { id: 'update-incident' });
        return false;
      }
    } catch (err) {
      console.error('Error updating incident:', err);
      toast.error('An error occurred while updating the incident.', { id: 'update-incident' });
      return false;
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
        <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-h-4 tw-w-4 tw-text-muted-foreground" />
        <Input
          placeholder="Search incidents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="tw-pl-10 tw-w-full"
        />
      </div>

      {loading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
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
                      {format(new Date(incident.date), 'MMM dd, yyyy, hh:mm a')}
                    </TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{incident.title}</TableCell>
                    <TableCell className="tw-whitespace-nowrap">{incident.type}</TableCell>
                    <TableCell className="tw-whitespace-nowrap">{incident.location}</TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{incident.description}</TableCell>
                    <TableCell>
                      {incident.image_url ? (
                        <img 
                          src={incident.image_url} 
                          alt="Incident" 
                          className="tw-h-10 tw-w-10 tw-object-cover tw-rounded-md" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.parentElement!.innerHTML = '<span class="tw-text-muted-foreground">Image</span>';
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
                          onClick={() => handleEdit(incident)}
                          className="tw-h-8 tw-w-8"
                        >
                          <Edit className="tw-h-4 tw-w-4" />
                          <span className="tw-sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(incident.id, incident.image_url)}
                          className="tw-h-8 tw-w-8"
                        >
                          <Trash2 className="tw-h-4 tw-w-4 tw-text-destructive" />
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
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:tw-max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Incident</DialogTitle>
            </DialogHeader>
            <IncidentForm
              onSubmit={handleUpdateIncident}
              isLoading={isSubmitting}
              initialIncident={{
                type: editingIncident.type,
                location: editingIncident.location,
                description: editingIncident.description,
                image_url: editingIncident.image_url,
                latitude: editingIncident.latitude,
                longitude: editingIncident.longitude,
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminIncidentTable;
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
import { AlertRow } from '@/types/supabase'; // Import AlertRow
import { Alert, NotificationService } from '@/services/NotificationService';
import { format } from 'date-fns';
import { Edit, Trash2, Search, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AlertForm from './AlertForm';
import { AnalyticsService } from '@/services/AnalyticsService';

interface AdminAlertTableProps {
  onAlertUpdated: () => void;
}

const AdminAlertTable: React.FC<AdminAlertTableProps> = ({ onAlertUpdated }) => {
  const [alerts, setAlerts] = useState<AlertRow[]>([]); // Use AlertRow
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAlert, setEditingAlert] = useState<AlertRow | null>(null); // Use AlertRow
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedAlerts = await NotificationService.fetchAlerts();
      setAlerts(fetchedAlerts);
      AnalyticsService.trackEvent({ name: 'admin_alert_table_loaded', properties: { count: fetchedAlerts.length } });
    } catch (err) {
      setError('Failed to load alerts. Please try again.');
      AnalyticsService.trackEvent({ name: 'admin_alert_table_load_failed', properties: { error: (err as Error).message } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDelete = async (alertId: string) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        toast.loading('Deleting alert...', { id: 'delete-alert' });
        const success = await NotificationService.deleteAlert(alertId);
        if (success) {
          toast.success('Alert deleted successfully!', { id: 'delete-alert' });
          fetchAlerts();
          onAlertUpdated();
          AnalyticsService.trackEvent({ name: 'admin_alert_deleted', properties: { alertId } });
        } else {
          toast.error('Failed to delete alert.', { id: 'delete-alert' });
          AnalyticsService.trackEvent({ name: 'admin_alert_delete_failed', properties: { alertId } });
        }
      } catch (err) {
        toast.error('An error occurred while deleting the alert.', { id: 'delete-alert' });
        AnalyticsService.trackEvent({ name: 'admin_alert_delete_error', properties: { alertId, error: (err as Error).message } });
      }
    }
  };

  const handleEdit = (alert: AlertRow) => { // Use AlertRow
    setEditingAlert(alert);
    setIsEditDialogOpen(true);
    AnalyticsService.trackEvent({ name: 'admin_alert_edit_opened', properties: { alertId: alert.id } });
  };

  const handleUpdateAlert = async (alertData: Omit<AlertRow, 'id' | 'created_at'>) => { // Use AlertRow
    if (!editingAlert) return false;

    setIsSubmitting(true);
    try {
      toast.loading('Updating alert...', { id: 'update-alert' });
      const updatedAlert = await NotificationService.updateAlert(editingAlert.id, alertData);
      
      if (updatedAlert) {
        toast.success('Alert updated successfully!', { id: 'update-alert' });
        setIsEditDialogOpen(false);
        setEditingAlert(null);
        fetchAlerts();
        onAlertUpdated();
        AnalyticsService.trackEvent({ name: 'admin_alert_updated', properties: { alertId: updatedAlert.id } });
        return true;
      } else {
        toast.error('Failed to update alert.', { id: 'update-alert' });
        AnalyticsService.trackEvent({ name: 'admin_alert_update_failed', properties: { alertId: editingAlert.id } });
        return false;
      }
    } catch (err) {
      toast.error('An error occurred while updating the alert.', { id: 'update-alert' });
      AnalyticsService.trackEvent({ name: 'admin_alert_update_error', properties: { alertId: editingAlert.id, error: (err as Error).message } });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter(alert =>
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRetry = () => {
    setError(null);
    fetchAlerts();
    AnalyticsService.trackEvent({ name: 'admin_alert_table_retry_fetch' });
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
          placeholder="Search alerts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="tw-pl-10 tw-w-full"
          aria-label="Search alerts"
        />
      </div>

      {loading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading alerts" />
        </div>
      ) : (
        <div className="tw-border tw-rounded-md tw-overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw-whitespace-nowrap">Created At</TableHead>
                <TableHead className="tw-min-w-[150px]">Title</TableHead>
                <TableHead className="tw-whitespace-nowrap">Type</TableHead>
                <TableHead className="tw-min-w-[200px]">Description</TableHead>
                <TableHead className="tw-whitespace-nowrap">Location</TableHead>
                <TableHead className="tw-text-right tw-whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="tw-h-24 tw-text-center tw-text-muted-foreground">
                    {searchTerm ? 'No alerts match your search.' : 'No alerts found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert.id} className="tw-break-words">
                    <TableCell className="tw-font-medium tw-whitespace-nowrap">
                      {format(new Date(alert.created_at!), 'MMM dd, yyyy, hh:mm a')}
                    </TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{alert.title}</TableCell>
                    <TableCell className="tw-whitespace-nowrap">{alert.type}</TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">{alert.description}</TableCell>
                    <TableCell className="tw-whitespace-nowrap tw-flex tw-items-center tw-gap-1">
                      <MapPin className="tw-h-4 tw-w-4 tw-text-muted-foreground" />
                      <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                    </TableCell>
                    <TableCell className="tw-text-right tw-whitespace-nowrap">
                      <div className="tw-flex tw-justify-end tw-gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(alert)}
                          className="tw-h-8 tw-w-8"
                          aria-label={`Edit alert ${alert.title}`}
                        >
                          <Edit className="tw-h-4 tw-w-4" aria-hidden="true" />
                          <span className="tw-sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(alert.id)}
                          className="tw-h-8 tw-w-8"
                          aria-label={`Delete alert ${alert.title}`}
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

      {editingAlert && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:tw-max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Alert</DialogTitle>
            </DialogHeader>
            <AlertForm
              formId="edit-alert-form"
              onSubmit={handleUpdateAlert}
              isLoading={isSubmitting}
              initialAlert={editingAlert}
            />
            <DialogFooter>
              <Button 
                type="submit" 
                form="edit-alert-form"
                disabled={isSubmitting} 
                className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground"
              >
                {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
                Update Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminAlertTable;
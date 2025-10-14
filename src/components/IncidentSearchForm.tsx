import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import useDebounce from '@/hooks/useDebounce';
import { IncidentFilter } from '@/services/IncidentService';
// Removed unused 'DateRange' import

const incidentFilterSchema = z.object({
  searchTerm: z.string().optional(),
  type: z.string().optional(),
  location: z.string().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});

type IncidentFilterFormValues = z.infer<typeof incidentFilterSchema>;

interface IncidentSearchFormProps {
  onFilterChange: (filters: IncidentFilter) => void;
  initialFilters?: IncidentFilter;
}

const incidentTypes = ['Fire', 'Crime', 'Accident', 'Medical', 'Other']; // Example types

const IncidentSearchForm: React.FC<IncidentSearchFormProps> = ({ onFilterChange, initialFilters = {} }) => {
  const form = useForm<IncidentFilterFormValues>({
    resolver: zodResolver(incidentFilterSchema),
    defaultValues: {
      searchTerm: initialFilters.searchTerm || '',
      type: initialFilters.type || '',
      location: initialFilters.location || '',
      dateRange: initialFilters.startDate || initialFilters.endDate ? {
        from: initialFilters.startDate ? parseISO(initialFilters.startDate) : undefined,
        to: initialFilters.endDate ? parseISO(initialFilters.endDate) : undefined,
      } : undefined,
    },
  });

  const { watch, setValue } = form;
  const searchTerm = watch('searchTerm');
  const type = watch('type');
  const location = watch('location');
  const dateRange = watch('dateRange');

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedLocation = useDebounce(location, 500);

  useEffect(() => {
    const filters: IncidentFilter = {
      searchTerm: debouncedSearchTerm || undefined,
      type: type || undefined,
      location: debouncedLocation || undefined,
      startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    };
    onFilterChange(filters);
  }, [debouncedSearchTerm, type, debouncedLocation, dateRange, onFilterChange]);

  return (
    <div className="tw-space-y-4 tw-p-4 tw-border tw-rounded-lg tw-bg-card tw-shadow-sm">
      <div className="tw-relative">
        <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-h-4 tw-w-4 tw-text-muted-foreground" />
        <Input
          placeholder="Search incidents (e.g., 'fire in Gainesville')"
          {...form.register('searchTerm')}
          className="tw-pl-10 tw-w-full tw-input"
        />
      </div>

      <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-3 tw-gap-4">
        <div>
          <Label htmlFor="type-filter" className="tw-sr-only">Incident Type</Label>
          <Select value={type} onValueChange={(value) => setValue('type', value === 'all' ? '' : value)}>
            <SelectTrigger id="type-filter" className="tw-w-full">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {incidentTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="location-filter" className="tw-sr-only">Location</Label>
          <Input
            id="location-filter"
            placeholder="Filter by Location (e.g., Gainesville)"
            {...form.register('location')}
            className="tw-input"
          />
        </div>

        <div>
          <Label htmlFor="date-range-filter" className="tw-sr-only">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date-range-filter"
                variant={"outline"}
                className={cn(
                  "tw-w-full tw-justify-start tw-text-left tw-font-normal",
                  !dateRange?.from && "tw-text-muted-foreground"
                )}
              >
                <CalendarIcon className="tw-mr-2 tw-h-4 tw-w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Filter by Date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="tw-w-auto tw-p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange ? { from: dateRange.from, to: dateRange.to } : undefined}
                onSelect={(range) => setValue('dateRange', range || undefined)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => {
          form.reset({ searchTerm: '', type: '', location: '', dateRange: undefined });
          onFilterChange({});
        }}
        className="tw-w-full"
      >
        <Filter className="tw-mr-2 tw-h-4 tw-w-4" /> Clear Filters
      </Button>
    </div>
  );
};

export default IncidentSearchForm;
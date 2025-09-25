import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPostTimestamp(timestamp: string | Date): string {
  return format(new Date(timestamp), 'MMM dd, yyyy, hh:mm a');
}
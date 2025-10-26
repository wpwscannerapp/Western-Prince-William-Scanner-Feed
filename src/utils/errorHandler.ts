"use client";

import { toast, type ExternalToast } from 'sonner';

export const handleError = (error: any, defaultMessage: string = 'An unexpected error occurred.', options?: ExternalToast) => {
  // Ensure 'error' is an Error object or create one from defaultMessage
  const actualError = error instanceof Error ? error : new Error(error?.message || defaultMessage);
  const message = actualError.message; // Use the message from the actualError

  toast.error(message, options);
  if (import.meta.env.DEV) { // Only log to console in development
    console.error('Application Error (handled):', actualError); // Log the actual Error object
  }
  return message;
};
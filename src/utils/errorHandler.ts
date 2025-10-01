import { toast, type ExternalToast } from 'sonner'; // Corrected import for toast options

export const handleError = (error: any, defaultMessage: string = 'An unexpected error occurred.', options?: ExternalToast) => {
  const message = error?.message || defaultMessage;
  toast.error(message, options); // Pass options to toast
  console.error('Application Error:', error);
  return message;
};
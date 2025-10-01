import { toast, type ToastOptions } from 'sonner'; // Import ToastOptions

export const handleError = (error: any, defaultMessage: string = 'An unexpected error occurred.', options?: ToastOptions) => {
  const message = error?.message || defaultMessage;
  toast.error(message, options); // Pass options to toast
  console.error('Application Error:', error);
  return message;
};
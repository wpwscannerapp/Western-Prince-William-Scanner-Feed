"use client";

import { handleError } from '@/utils/errorHandler';
import { AnalyticsService } from '@/services/AnalyticsService';

interface NetlifyFunctionResponse<T> {
  data?: T;
  error?: string;
}

export const NetlifyClient = {
  async invoke<T>(functionName: string, payload: object = {}): Promise<NetlifyFunctionResponse<T>> {
    try {
      const response = await fetch(`/.netlify/functions/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || `Netlify Function '${functionName}' failed with status ${response.status}`;
        handleError(new Error(errorMessage), `Netlify Function Error: ${errorMessage}`);
        AnalyticsService.trackEvent({ name: 'netlify_function_invoke_failed', properties: { functionName, status: response.status, error: errorMessage } });
        return { error: errorMessage };
      }
      
      AnalyticsService.trackEvent({ name: 'netlify_function_invoke_success', properties: { functionName } });
      return { data: result as T };
    } catch (err: any) {
      handleError(err, `An unexpected error occurred while invoking Netlify Function '${functionName}'.`);
      AnalyticsService.trackEvent({ name: 'netlify_function_invoke_unexpected_error', properties: { functionName, error: err.message } });
      return { error: err.message };
    }
  },
};
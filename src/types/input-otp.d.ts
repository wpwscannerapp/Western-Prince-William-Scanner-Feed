// src/types/input-otp.d.ts
declare module 'input-otp' {
  import * as React from 'react';

  interface OTPInputContextValue {
    slots: Array<{
      char: string | null;
      hasFakeCaret: boolean;
      isActive: boolean;
    }>;
    // Add other properties if they exist in the context
  }

  export const OTPInput: React.FC<any>; // Use a more specific type if available
  export const OTPInputContext: React.Context<OTPInputContextValue>;
}
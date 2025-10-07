import React from 'react';

export const MadeWithDyad: React.FC = () => {
  return (
    <div className="tw-w-full tw-py-4 tw-text-center tw-text-xs tw-text-muted-foreground tw-mt-8">
      Made with <a href="https://dyad.sh" target="_blank" rel="noopener noreferrer" className="tw-underline hover:tw-text-primary">Dyad</a>
    </div>
  );
};
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
    <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading content" />
  </div>
);

export function lazyLoad<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingFallback />
) {
  const LazyComponent = React.lazy(factory);
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}
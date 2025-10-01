import React from 'react';

interface SkeletonLoaderProps {
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ count = 1, className = '' }) => {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className={`tw-bg-card tw-p-4 tw-rounded-lg tw-animate-pulse ${className}`}>
          <div className="tw-h-6 tw-bg-muted tw-rounded tw-mb-2" />
          <div className="tw-h-4 tw-bg-muted tw-rounded tw-w-3/4" />
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;
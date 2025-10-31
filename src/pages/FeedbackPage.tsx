import React from 'react';
import FeedbackForm from '@/components/FeedbackForm';

const FeedbackPage: React.FC = () => {
  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Feedback & Suggestions</h1>
      <FeedbackForm />
    </div>
  );
};

export default FeedbackPage;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AnonymousReportForm from '@/components/AnonymousReportForm';

const AnonymousReportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-mb-6 tw-text-foreground tw-text-center">Report Incident</h1>
      <AnonymousReportForm />
    </div>
  );
};

export default AnonymousReportPage;
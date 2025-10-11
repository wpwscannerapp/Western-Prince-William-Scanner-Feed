import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, Mail, User, Briefcase, Loader2 } from 'lucide-react'; // Added Mail, User, Briefcase icons
import { SettingsService, ContactSettings, ContactCard } from '@/services/SettingsService'; // Import ContactCard
import { handleError } from '@/utils/errorHandler';
import { CONTACT_US_TITLE, CONTACT_US_DESCRIPTION } from '@/lib/constants';

const ContactUsPage: React.FC = () => {
  const navigate = useNavigate();
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const settings = await SettingsService.getContactSettings();
        if (settings) {
          setContactSettings(settings);
        } else {
          setError('Failed to load contact information.');
        }
      } catch (err) {
        setError(handleError(err, 'An unexpected error occurred while fetching contact information.'));
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading contact information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error</h1>
          <p className="tw-text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/home')} className="tw-mt-4 tw-button">Go to Home Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <Card className="tw-bg-card tw-border-border tw-shadow-lg tw-text-center">
        <CardHeader>
          <Phone className="tw-h-16 tw-w-16 tw-text-primary tw-mx-auto tw-mb-4" />
          <CardTitle className="tw-text-3xl tw-font-bold tw-text-foreground">{CONTACT_US_TITLE}</CardTitle>
          <CardDescription className="tw-text-muted-foreground tw-mt-2">
            {CONTACT_US_DESCRIPTION}
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          {contactSettings && contactSettings.contact_cards.length > 0 ? (
            <div className="tw-space-y-6">
              {contactSettings.contact_cards.map((card: ContactCard, index: number) => (
                <Card key={index} className="tw-bg-background tw-border-border tw-shadow-sm tw-p-4 tw-text-left">
                  <h3 className="tw-text-xl tw-font-semibold tw-text-foreground tw-mb-2 tw-flex tw-items-center tw-gap-2">
                    <User className="tw-h-5 tw-w-5 tw-text-primary" /> {card.name}
                  </h3>
                  {card.title && (
                    <p className="tw-text-muted-foreground tw-mb-1 tw-flex tw-items-center tw-gap-2">
                      <Briefcase className="tw-h-4 tw-w-4" /> {card.title}
                    </p>
                  )}
                  {card.email && (
                    <p className="tw-text-foreground tw-mb-1 tw-flex tw-items-center tw-gap-2">
                      <Mail className="tw-h-4 tw-w-4 tw-text-secondary" /> 
                      <a href={`mailto:${card.email}`} className="tw-text-primary hover:tw-underline">
                        {card.email}
                      </a>
                    </p>
                  )}
                  {card.phone && (
                    <p className="tw-text-foreground tw-flex tw-items-center tw-gap-2">
                      <Phone className="tw-h-4 tw-w-4 tw-text-secondary" /> 
                      <a href={`tel:${card.phone}`} className="tw-text-primary hover:tw-underline">
                        {card.phone}
                      </a>
                    </p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="tw-text-lg tw-text-muted-foreground">
              No contact information available at this time. Please check back later.
            </p>
          )}
          <p className="tw-text-sm tw-text-muted-foreground tw-mt-4">
            For general inquiries, you can also reach us via email at wpwscannerfeed@gmail.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactUsPage;
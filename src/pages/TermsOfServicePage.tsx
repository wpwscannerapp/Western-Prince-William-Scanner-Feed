import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-4xl"> {/* Removed tw-pt-24 as Layout handles it */}
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardHeader className="tw-text-center">
          <CardTitle className="tw-text-3xl tw-font-bold tw-text-foreground">Terms of Service</CardTitle>
          <CardDescription className="tw-text-muted-foreground tw-mt-2">
            Last Updated: July 26, 2024
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-prose dark:tw-prose-invert tw-max-w-none tw-p-6 tw-text-foreground">
          <p>Welcome to Western Prince William Scanner Feed! These Terms of Service ("Terms") govern your access to and use of our website, services, and applications (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.</p>

          <h2>1. Acceptance of Terms</h2>
          <p>By creating an account, subscribing, or using the Service, you confirm that you have read, understood, and agree to be bound by these Terms, including our Privacy Policy. If you do not agree with these Terms, you must not use the Service.</p>

          <h2>2. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Service after such modifications constitutes your acceptance of the new Terms.</p>

          <h2>3. User Accounts</h2>
          <ul>
            <li><strong>Registration:</strong> You must register for an account to access certain features of the Service. You agree to provide accurate, current, and complete information during the registration process.</li>
            <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</li>
            <li><strong>Eligibility:</strong> You must be at least 13 years old to use the Service. If you are under 18, you must have parental or guardian consent.</li>
          </ul>

          <h2>4. Subscriptions and Payments</h2>
          <ul>
            <li><strong>Free Trial:</strong> We may offer a free trial period. After the trial, you will be charged the subscription fee unless you cancel.</li>
            <li><strong>Billing:</strong> Subscriptions are billed on a recurring basis (e.g., monthly). You authorize us to charge your payment method for all applicable fees.</li>
            <li><strong>Cancellations:</strong> You can cancel your subscription at any time. Cancellations will take effect at the end of your current billing period.</li>
            <li><strong>Refunds:</strong> Subscription fees are generally non-refundable, except as required by law.</li>
          </ul>

          <h2>5. Content and Conduct</h2>
          <ul>
            <li><strong>Service Content:</strong> All content provided through the Service, including scanner updates, images, and text, is for informational purposes only.</li>
            <li><strong>User-Generated Content:</strong> You are responsible for any content you post, including comments. You agree not to post content that is illegal, offensive, or infringes on others' rights.</li>
            <li><strong>Prohibited Activities:</strong> You agree not to use the Service for any unlawful purpose, to harass others, or to interfere with the Service's operation.</li>
          </ul>

          <h2>6. Intellectual Property</h2>
          <p>All content, trademarks, and intellectual property on the Service are owned by Western Prince William Scanner Feed or its licensors. You may not use any content without our express written permission.</p>

          <h2>7. Disclaimers and Limitation of Liability</h2>
          <p>The Service is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Service, to the fullest extent permitted by law.</p>

          <h2>8. Governing Law</h2>
          <p>These Terms shall be governed by the laws of the Commonwealth of Virginia, without regard to its conflict of law principles.</p>

          <h2>9. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at wpwscannerfeed@gmail.com.</p>

          <div className="tw-flex tw-justify-center tw-mt-8">
            <Button onClick={() => navigate(-1)} className="tw-button">
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsOfServicePage;
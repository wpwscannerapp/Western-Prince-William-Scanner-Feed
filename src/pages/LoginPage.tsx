"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, forgotPassword, user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPasswordInput, setShowForgotPasswordInput] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/home', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await signIn(values.email, values.password);
      if (!error) {
        AnalyticsService.trackEvent({ name: 'user_signed_in', properties: { email: values.email } });
        // Navigation handled by useEffect
      } else {
        AnalyticsService.trackEvent({ name: 'sign_in_failed', properties: { email: values.email, error: error.message } });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast.error('Please enter your email address to reset your password.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { success } = await forgotPassword(email);
      if (success) {
        AnalyticsService.trackEvent({ name: 'forgot_password_email_sent', properties: { email } });
        setShowForgotPasswordInput(false); // Hide input after sending email
      } else {
        AnalyticsService.trackEvent({ name: 'forgot_password_failed', properties: { email } });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading authentication" />
        <p className="tw-ml-2">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-gradient-to-br tw-from-primary/10 tw-to-background tw-text-foreground tw-p-4">
      <Card className="tw-w-full tw-max-w-md tw-bg-card tw-shadow-lg tw-transition tw-duration-300 hover:tw-shadow-xl">
        <CardHeader className="tw-text-center">
          <CardTitle className="tw-text-2xl tw-font-bold tw-text-foreground">Login</CardTitle>
          <CardDescription className="tw-text-muted-foreground">Access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-4">
            <div>
              <Label htmlFor="email" className="tw-mb-2 tw-block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...form.register('email')}
                className="tw-bg-input tw-text-foreground"
                autoComplete="email"
                disabled={isSubmitting}
                aria-invalid={form.formState.errors.email ? "true" : "false"}
                aria-describedby={form.formState.errors.email ? "email-error" : undefined}
              />
              {form.formState.errors.email && (
                <p id="email-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            {!showForgotPasswordInput && (
              <div>
                <Label htmlFor="password" className="tw-mb-2 tw-block">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...form.register('password')}
                  className="tw-bg-input tw-text-foreground"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  aria-invalid={form.formState.errors.password ? "true" : "false"}
                  aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                />
                {form.formState.errors.password && (
                  <p id="password-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>
            )}

            {showForgotPasswordInput ? (
              <Button type="button" onClick={handleForgotPasswordSubmit} className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-button" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
                Send Reset Email
              </Button>
            ) : (
              <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-button" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
                Login
              </Button>
            )}
          </form>

          <div className="tw-text-center tw-text-sm tw-mt-4">
            {showForgotPasswordInput ? (
              <Button variant="link" onClick={() => setShowForgotPasswordInput(false)} className="tw-text-primary hover:tw-text-primary/80">
                Back to Login
              </Button>
            ) : (
              <>
                <Button variant="link" onClick={() => navigate('/auth/signup')} className="tw-text-primary hover:tw-text-primary/80">
                  Don't have an account? Sign Up
                </Button>
                <span className="tw-text-muted-foreground tw-mx-2">|</span>
                <Button variant="link" onClick={() => setShowForgotPasswordInput(true)} className="tw-text-primary hover:tw-text-primary/80">
                  Forgot Password?
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
    </div>
  );
};

export default LoginPage;
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

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
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

  const onSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await signUp(values.email, values.password);
      if (!error) {
        // Navigation handled by useEffect after successful signup and email confirmation
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-gradient-to-br tw-from-primary/10 tw-to-background tw-text-foreground tw-p-4">
      <Card className="tw-w-full tw-max-w-md tw-bg-card tw-shadow-lg tw-transition tw-duration-300 hover:tw-shadow-xl">
        <CardHeader className="tw-text-center">
          <CardTitle className="tw-text-2xl tw-font-bold tw-text-foreground">Sign Up</CardTitle>
          <CardDescription className="tw-text-muted-foreground">Create your new account</CardDescription>
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
              />
              {form.formState.errors.email && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password" className="tw-mb-2 tw-block">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register('password')}
                className="tw-bg-input tw-text-foreground"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              {form.formState.errors.password && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
              Sign Up
            </Button>
          </form>

          <div className="tw-text-center tw-text-sm tw-mt-4">
            <Button variant="link" onClick={() => navigate('/auth/login')} className="tw-text-primary hover:tw-text-primary/80">
              Already have an account? Login
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
    </div>
  );
};

export default SignupPage;
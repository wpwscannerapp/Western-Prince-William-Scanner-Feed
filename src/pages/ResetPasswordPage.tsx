import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import from config.ts

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Moderate';
    return 'Strong';
  };

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setLoading(true);
    const refreshToken = searchParams.get('refresh_token');
    
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.length < 10) {
      handleError(null, 'Invalid reset link. Please request a new password reset.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      handleError(null, 'Password reset request timed out. Please try again.');
    }, SUPABASE_API_TIMEOUT); // Use constant from config.ts

    try {
      const { error: sessionError } = await supabase.auth.setSession({
        refresh_token: refreshToken,
        access_token: '',
      });

      if (sessionError) {
        handleError(sessionError, 'Invalid or expired reset link. Please request a new password reset.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        handleError(error, 'Failed to reset password.');
        setLoading(false);
        return;
      }

      toast.success('Password reset successfully!');
      setResetComplete(true);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Timeout already handled by the setTimeout callback
      } else {
        handleError(err, 'An unexpected error occurred during password reset.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  if (resetComplete) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <Card className="tw-w-full tw-max-w-lg">
          <CardHeader className="tw-text-center">
            <CheckCircle className="tw-h-12 tw-w-12 tw-text-primary tw-mx-auto tw-mb-4 tw-animate-pulse" aria-hidden="true" />
            <CardTitle className="tw-text-2xl tw-font-bold">Password Reset Complete</CardTitle>
            <CardDescription>Your password has been successfully updated.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="tw-w-full tw-button">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
      <Card className="tw-w-full tw-max-w-lg">
        <CardHeader>
          <CardTitle className="tw-text-2xl tw-font-bold">Reset Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register('password')}
                className="tw-mt-1 tw-bg-input tw-text-foreground tw-input"
                aria-describedby={form.formState.errors.password ? "password-error" : undefined}
              />
              {form.watch('password') && (
                <p className={`tw-text-sm tw-mt-1 ${getPasswordStrength(form.watch('password')) === 'Strong' ? 'tw-text-primary' : getPasswordStrength(form.watch('password')) === 'Moderate' ? 'tw-text-accent' : 'tw-text-destructive'}`}>
                  Password Strength: {getPasswordStrength(form.watch('password'))}
                </p>
              )}
              {form.formState.errors.password && (
                <p id="password-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...form.register('confirmPassword')}
                className="tw-mt-1 tw-bg-input tw-text-foreground tw-input"
                aria-describedby={form.formState.errors.confirmPassword ? "confirm-password-error" : undefined}
              />
              {form.formState.errors.confirmPassword && (
                <p id="confirm-password-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="tw-w-full tw-button" disabled={loading}>
              {loading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
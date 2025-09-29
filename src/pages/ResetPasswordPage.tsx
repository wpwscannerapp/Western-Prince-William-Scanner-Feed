import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MadeWithDyad } from '@/components/made-with-dyad';

const passwordResetSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Get the token from URL parameters
    const token = searchParams.get('token');
    if (token) {
      setResetToken(token);
    } else {
      toast.error('Invalid or missing reset token');
      navigate('/auth');
    }
  }, [searchParams, navigate]);

  const onSubmit = async (values: PasswordResetFormValues) => {
    if (!resetToken) {
      toast.error('Invalid reset token');
      return;
    }

    setLoading(true);
    toast.loading('Resetting password...', { id: 'reset-password' });

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        toast.error(error.message, { id: 'reset-password' });
      } else {
        toast.success('Password reset successfully!', { id: 'reset-password' });
        navigate('/auth');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred', { id: 'reset-password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-4 tw-bg-background tw-text-foreground">
      <Card className="tw-w-full tw-max-w-md">
        <CardHeader className="tw-text-center">
          <CardTitle className="tw-text-2xl">Reset Password</CardTitle>
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
                className="tw-mt-1 tw-bg-input tw-text-foreground"
              />
              {form.formState.errors.password && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...form.register('confirmPassword')}
                className="tw-mt-1 tw-bg-input tw-text-foreground"
              />
              {form.formState.errors.confirmPassword && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={loading}>
              {loading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="tw-mt-6">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default ResetPasswordPage;
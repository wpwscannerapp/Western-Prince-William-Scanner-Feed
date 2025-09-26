import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const authSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type AuthFormValues = z.infer<typeof authSchema>;

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, signUp, forgotPassword } = useAuth();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: AuthFormValues) => {
    if (isLogin) {
      await signIn(values.email, values.password);
    } else {
      await signUp(values.email, values.password);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast.error('Please enter your email address to reset your password.');
      return;
    }
    await forgotPassword(email);
  };

  return (
    <div className="tw-w-full tw-max-w-md tw-p-8 tw-space-y-6 tw-bg-card tw-rounded-lg tw-shadow-lg tw-border tw-border-border">
      <h2 className="tw-text-2xl tw-font-bold tw-text-center tw-text-foreground">
        {isLogin ? 'Login' : 'Sign Up'}
      </h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...form.register('email')}
            className="tw-mt-1"
            autoComplete="email" // Added autocomplete for email
          />
          {form.formState.errors.email && (
            <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>
        {!showForgotPassword && (
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...form.register('password')}
              className="tw-mt-1"
              autoComplete={isLogin ? "current-password" : "new-password"} // Added autocomplete for password
            />
            {form.formState.errors.password && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
        )}

        {showForgotPassword ? (
          <Button type="button" onClick={handleForgotPassword} className="tw-w-full tw-bg-blue-600 hover:tw-bg-blue-700">
            Send Reset Email
          </Button>
        ) : (
          <Button type="submit" className="tw-w-full tw-bg-blue-600 hover:tw-bg-blue-700">
            {isLogin ? 'Login' : 'Sign Up'}
          </Button>
        )}
      </form>

      <div className="tw-text-center tw-text-sm">
        {showForgotPassword ? (
          <Button variant="link" onClick={() => setShowForgotPassword(false)} className="tw-text-blue-400 hover:tw-text-blue-300">
            Back to Login
          </Button>
        ) : (
          <>
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="tw-text-blue-400 hover:tw-text-blue-300">
              {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
            </Button>
            <span className="tw-text-muted-foreground tw-mx-2">|</span>
            <Button variant="link" onClick={() => setShowForgotPassword(true)} className="tw-text-blue-400 hover:tw-text-blue-300">
              Forgot Password?
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
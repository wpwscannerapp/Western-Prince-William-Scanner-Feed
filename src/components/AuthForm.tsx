import React, { useState } from 'react';
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
    <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border border-border">
      <h2 className="text-2xl font-bold text-center text-foreground">
        {isLogin ? 'Login' : 'Sign Up'}
      </h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...form.register('email')}
            className="mt-1"
          />
          {form.formState.errors.email && (
            <p className="text-destructive text-sm mt-1">{form.formState.errors.email.message}</p>
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
              className="mt-1"
            />
            {form.formState.errors.password && (
              <p className="text-destructive text-sm mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
        )}

        {showForgotPassword ? (
          <Button type="button" onClick={handleForgotPassword} className="w-full bg-blue-600 hover:bg-blue-700">
            Send Reset Email
          </Button>
        ) : (
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            {isLogin ? 'Login' : 'Sign Up'}
          </Button>
        )}
      </form>

      <div className="text-center text-sm">
        {showForgotPassword ? (
          <Button variant="link" onClick={() => setShowForgotPassword(false)} className="text-blue-400 hover:text-blue-300">
            Back to Login
          </Button>
        ) : (
          <>
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:text-blue-300">
              {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
            </Button>
            <span className="text-muted-foreground mx-2">|</span>
            <Button variant="link" onClick={() => setShowForgotPassword(true)} className="text-blue-400 hover:text-blue-300">
              Forgot Password?
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
import { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

enum ResetStatus {
  PENDING = 'pending',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  INVALID_TOKEN = 'invalid_token'
}

// Password reset schema (matches backend schema)
const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid token format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<ResetStatus>(ResetStatus.PENDING);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  // Get token from URL
  const query = new URLSearchParams(window.location.search);
  const token = query.get('token');

  // Validate token format immediately
  if (!token || !z.string().uuid().safeParse(token).success) {
    if (status !== ResetStatus.INVALID_TOKEN) {
      setStatus(ResetStatus.INVALID_TOKEN);
      setErrorMessage('Invalid or missing reset token. Please request a new password reset link.');
    }
  }

  // Set up form
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || '',
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    try {
      setStatus(ResetStatus.LOADING);
      
      const response = await apiRequest('POST', '/api/auth/reset-password', values);
      
      if (response.ok) {
        setStatus(ResetStatus.SUCCESS);
      } else {
        const data = await response.json();
        setStatus(ResetStatus.ERROR);
        setErrorMessage(data.message || 'Failed to reset password. The link may be expired or invalid.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setStatus(ResetStatus.ERROR);
      setErrorMessage('An error occurred while trying to reset your password. Please try again later.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case ResetStatus.INVALID_TOKEN:
        return (
          <>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-amber-500" />
              </div>
              <CardTitle className="text-center text-2xl">Invalid Reset Link</CardTitle>
              <CardDescription className="text-center">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setLocation('/forgot-password')}>
                Request New Reset Link
              </Button>
            </CardFooter>
          </>
        );
        
      case ResetStatus.LOADING:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
            <p className="text-center text-lg">Resetting your password...</p>
          </div>
        );

      case ResetStatus.SUCCESS:
        return (
          <>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-center text-2xl">Password Reset Complete</CardTitle>
              <CardDescription className="text-center">
                Your password has been successfully reset. You can now sign in with your new password.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setLocation('/auth')}>
                Sign In
              </Button>
            </CardFooter>
          </>
        );

      case ResetStatus.ERROR:
        return (
          <>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-center text-2xl">Password Reset Failed</CardTitle>
              <CardDescription className="text-center">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setLocation('/forgot-password')}>
                Try Again
              </Button>
            </CardFooter>
          </>
        );
        
      case ResetStatus.PENDING:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Reset Your Password</CardTitle>
              <CardDescription className="text-center">
                Enter a new password for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <input type="hidden" name="token" value={token || ''} />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Reset Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center mb-4">
          <h1 className="text-2xl font-bold">Reset Password</h1>
        </div>
        <Card>
          {renderContent()}
        </Card>
      </div>
    </div>
  );
}
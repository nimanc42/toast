import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { Loader2, CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

enum ForgotPasswordStatus {
  FORM = 'form',
  LOADING = 'loading',
  SUCCESS = 'success'
}

// Forgot password schema (matches backend schema)
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<ForgotPasswordStatus>(ForgotPasswordStatus.FORM);
  const [email, setEmail] = useState<string>('');
  const { toast } = useToast();

  // Set up form
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      setEmail(values.email);
      setStatus(ForgotPasswordStatus.LOADING);
      
      const response = await apiRequest('POST', '/api/auth/forgot-password', values);
      
      if (response.ok) {
        setStatus(ForgotPasswordStatus.SUCCESS);
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.message || 'Failed to send password reset email. Please try again.',
          variant: 'destructive'
        });
        setStatus(ForgotPasswordStatus.FORM);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again later.',
        variant: 'destructive'
      });
      setStatus(ForgotPasswordStatus.FORM);
    }
  };

  const renderContent = () => {
    switch (status) {
      case ForgotPasswordStatus.LOADING:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
            <p className="text-center text-lg">Sending reset instructions...</p>
          </div>
        );

      case ForgotPasswordStatus.SUCCESS:
        return (
          <>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Mail className="h-16 w-16 text-blue-500" />
              </div>
              <CardTitle className="text-center text-2xl">Check Your Email</CardTitle>
              <CardDescription className="text-center">
                We've sent password reset instructions to <strong>{email}</strong>. 
                Please check your email inbox and follow the link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              <p>If you don't see the email, check your spam folder.</p>
              <p className="mt-2">The link will expire in 30 minutes.</p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setStatus(ForgotPasswordStatus.FORM)}
              >
                Try a different email
              </Button>
              <Button 
                variant="link"
                onClick={() => setLocation('/auth')}
              >
                Back to sign in
              </Button>
            </CardFooter>
          </>
        );

      case ForgotPasswordStatus.FORM:
      default:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Forgot Password</CardTitle>
              <CardDescription className="text-center">
                Enter your email address and we'll send you a link to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="yourname@example.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Send Reset Link
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button 
                variant="link"
                onClick={() => setLocation('/auth')}
              >
                Back to sign in
              </Button>
            </CardFooter>
          </>
        );
    }
  };

  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center mb-4">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
        </div>
        <Card>
          {renderContent()}
        </Card>
      </div>
    </div>
  );
}
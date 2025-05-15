import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

enum VerificationStatus {
  VERIFYING = 'verifying',
  SUCCESS = 'success',
  ERROR = 'error'
}

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<VerificationStatus>(VerificationStatus.VERIFYING);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get token from URL query parameters
  const query = new URLSearchParams(window.location.search);
  const token = query.get('token');

  useEffect(() => {
    if (!token) {
      setStatus(VerificationStatus.ERROR);
      setErrorMessage('Invalid verification link. No token found.');
      return;
    }

    const verifyEmail = async () => {
      try {
        // Send verification request
        const response = await apiRequest('POST', '/api/auth/verify-email', { token });
        
        if (response.ok) {
          setStatus(VerificationStatus.SUCCESS);
        } else {
          const data = await response.json();
          setStatus(VerificationStatus.ERROR);
          setErrorMessage(data.message || 'Failed to verify email. The link may be expired or invalid.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus(VerificationStatus.ERROR);
        setErrorMessage('An error occurred while trying to verify your email. Please try again later.');
      }
    };

    verifyEmail();
  }, [token]);

  const renderContent = () => {
    switch (status) {
      case VerificationStatus.VERIFYING:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
            <p className="text-center text-lg">Verifying your email address...</p>
          </div>
        );

      case VerificationStatus.SUCCESS:
        return (
          <>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-center text-2xl">Email Verified!</CardTitle>
              <CardDescription className="text-center">
                Your email has been successfully verified. Thank you for confirming your email address.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setLocation('/auth')}>
                Sign In
              </Button>
            </CardFooter>
          </>
        );

      case VerificationStatus.ERROR:
        return (
          <>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-center text-2xl">Verification Failed</CardTitle>
              <CardDescription className="text-center">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setLocation('/auth')}>
                Back to Sign In
              </Button>
              <Button onClick={() => setLocation('/resend-verification')}>
                Resend Verification
              </Button>
            </CardFooter>
          </>
        );
    }
  };

  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[360px]">
        <div className="flex flex-col space-y-2 text-center mb-4">
          <h1 className="text-2xl font-bold">Email Verification</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
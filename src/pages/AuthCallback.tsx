
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the URL parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (!accessToken || type !== 'signup') {
          // Not a valid signup confirmation
          navigate('/login');
          return;
        }

        // Set the session using the tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          throw error;
        }

        toast({
          title: 'Email verified!',
          description: 'Your email has been verified successfully.',
        });
        
        navigate('/');
      } catch (err: any) {
        console.error('Email confirmation error:', err);
        setError(err.message || 'Failed to confirm your email');
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold mb-2">Verifying your email...</h1>
            <p className="text-muted-foreground">Please wait while we confirm your email address.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

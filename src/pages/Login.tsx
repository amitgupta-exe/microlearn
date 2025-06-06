
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { toast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRole } from '@/lib/types';
import * as z from 'zod';

const adminLoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['superadmin', 'admin']),
});

const learnerLoginSchema = z.object({
  phone: z.string().min(10, { message: 'Please enter a valid phone number' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;
type LearnerLoginFormValues = z.infer<typeof learnerLoginSchema>;

const Login: React.FC = () => {
  const { signIn, signInLearner } = useMultiAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginType, setLoginType] = useState<'admin' | 'learner'>('admin');

  const adminForm = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'admin',
    },
  });

  const learnerForm = useForm<LearnerLoginFormValues>({
    resolver: zodResolver(learnerLoginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const onAdminSubmit = async (values: AdminLoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signIn(values.email, values.password, values.role);
      if (error) {
        setError(
          error.message === 'Email not confirmed'
            ? 'Please verify your email before logging in'
            : 'Invalid email or password'
        );
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const onLearnerSubmit = async (values: LearnerLoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signInLearner(values.phone, values.password);
      if (error) {
        setError('Invalid phone number or password');
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      navigate('/learner-dashboard');
    } catch (err) {
      console.error('Learner login error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <Select value={loginType} onValueChange={(value: 'admin' | 'learner') => setLoginType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select login type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin / Super Admin</SelectItem>
              <SelectItem value="learner">Learner</SelectItem>
            </SelectContent>
          </Select>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loginType === 'admin' ? (
            <Form {...adminForm}>
              <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-6">
                <FormField
                  control={adminForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="name@example.com" 
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link 
                          to="/forgot-password" 
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...learnerForm}>
              <form onSubmit={learnerForm.handleSubmit(onLearnerSubmit)} className="space-y-6">
                <FormField
                  control={learnerForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Enter your phone number" 
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={learnerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in as Learner'}
                </Button>
              </form>
            </Form>
          )}
        </div>

        {loginType === 'admin' && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

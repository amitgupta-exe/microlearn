
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Shield, Users, GraduationCap } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRole } from '@/lib/types';
import * as z from 'zod';
import { cn } from '@/lib/utils';

const adminLoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const learnerLoginSchema = z.object({
  phone: z.string().min(10, { message: 'Please enter a valid phone number' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;
type LearnerLoginFormValues = z.infer<typeof learnerLoginSchema>;

const roleConfig = {
  superadmin: {
    title: 'Super Admin',
    description: 'Full system access',
    icon: Shield,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
  },
  admin: {
    title: 'Admin',
    description: 'Manage courses and learners',
    icon: Users,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
  },
  learner: {
    title: 'Learner',
    description: 'Access your courses',
    icon: GraduationCap,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
  },
};

const Login: React.FC = () => {
  const { signIn, signInLearner } = useMultiAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  const adminForm = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
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
      const { error } = await signIn(values.email, values.password, selectedRole as 'admin' | 'superadmin');
      if (error) {
        setError(
          error.message === 'Email not confirmed'
            ? 'Please verify your email before logging in'
            : error.message === 'Invalid role for this user'
            ? `You don't have ${selectedRole} access`
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

  const config = roleConfig[selectedRole];
  const Icon = config.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Choose your role and sign in to your account</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-lg">
          {(Object.keys(roleConfig) as UserRole[]).map((role) => {
            const roleConf = roleConfig[role];
            const RoleIcon = roleConf.icon;
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-md transition-all duration-200",
                  selectedRole === role
                    ? `${roleConf.bgColor} ${roleConf.borderColor} border-2 shadow-sm`
                    : "hover:bg-white hover:shadow-sm"
                )}
              >
                <RoleIcon 
                  className={cn(
                    "h-6 w-6 mb-1",
                    selectedRole === role ? roleConf.textColor : "text-gray-500"
                  )} 
                />
                <span 
                  className={cn(
                    "text-xs font-medium",
                    selectedRole === role ? roleConf.textColor : "text-gray-600"
                  )}
                >
                  {roleConf.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Login Form Card */}
        <Card className={cn("border-2", config.borderColor)}>
          <CardHeader className={cn("text-center", config.bgColor)}>
            <div className="flex items-center justify-center mb-2">
              <div className={cn("p-2 rounded-full", config.color)}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className={config.textColor}>{config.title} Login</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {selectedRole === 'learner' ? (
              <Form {...learnerForm}>
                <form onSubmit={learnerForm.handleSubmit(onLearnerSubmit)} className="space-y-4">
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
                    className={cn("w-full", config.color)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : `Sign in as ${config.title}`}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...adminForm}>
                <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
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
                    className={cn("w-full", config.color)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : `Sign in as ${config.title}`}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {selectedRole !== 'learner' && (
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

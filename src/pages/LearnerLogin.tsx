
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
import { AlertCircle, ArrowLeft, GraduationCap } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const learnerLoginSchema = z.object({
  phone: z.string().min(10, { message: 'Please enter a valid phone number' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LearnerLoginFormValues = z.infer<typeof learnerLoginSchema>;

const LearnerLogin: React.FC = () => {
  const { learnerLogin } = useMultiAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LearnerLoginFormValues>({
    resolver: zodResolver(learnerLoginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (values: LearnerLoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await learnerLogin(values.phone, values.password);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
            <span className="text-gray-600">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">EduLearn</h1>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="border-2 border-green-200 bg-white shadow-lg">
            <CardHeader className="text-center bg-green-50">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-full bg-green-500">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-green-700">Learner Login</CardTitle>
              <CardDescription className="text-gray-600">Access your courses</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="Enter your phone number" 
                            {...field}
                            disabled={isLoading}
                            className="bg-white border-gray-300 focus:border-green-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your password (default: your phone number)"
                            {...field}
                            disabled={isLoading}
                            className="bg-white border-gray-300 focus:border-green-400"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-500">Default password is your phone number without country code</p>
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full text-white bg-green-500 hover:bg-green-600"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in as Learner'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LearnerLogin;

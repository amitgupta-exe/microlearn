
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import { WatiConfig } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  serri_api_key: z.string().min(1, {
    message: "Access Token is required.",
  }),
});

const WhatsApp = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serri_api_key: '',
    },
  });
  
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('whatsapp_config')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching WhatsApp config:', error);
          return;
        }
        
        if (data) {
          setIsConfigured(data.is_configured);
          setConfigId(data.id);
          
          form.reset({
            serri_api_key: data.serri_api_key || '',
          });
        }
      } catch (error) {
        console.error('Error loading WhatsApp config:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfig();
  }, [form, user]);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error('You must be logged in to save configuration');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const config: WatiConfig = {
        serri_api_key: data.serri_api_key,
        is_configured: true,
        user_id: user.id,
      };
      
      let saveError;
      
      if (configId) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update(config)
          .eq('id', configId);
          
        saveError = error;
      } else {
        const { error } = await supabase
          .from('whatsapp_config')
          .insert([config]);
          
        saveError = error;
      }
      
      if (saveError) {
        console.error('Error saving WhatsApp config:', saveError);
        toast.error('Failed to save configuration');
        return;
      }
      
      setIsConfigured(true);
      toast.success('WhatsApp configuration saved successfully');
      
      if (!configId) {
        const { data } = await supabase
          .from('whatsapp_config')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (data) {
          setConfigId(data.id);
        }
      }
    } catch (error) {
      toast.error('Failed to save configuration. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      
      // Send a test message to verify the configuration
      const { data, error } = await supabase.functions.invoke('send-course-notification', {
        body: {
          learner_name: 'Test User',
          learner_phone: '9767989231', // Example phone number
          course_name: 'Test Course',
          start_date: new Date().toLocaleDateString(),
          type: 'test'
        }
      });
      
      if (error) {
        console.error('Error verifying WhatsApp connection:', error);
        setVerificationStatus('error');
        toast.error('Failed to verify WhatsApp connection. Please check your credentials.');
        return;
      }
      
      console.log('Verification response:', data);
      
      setVerificationStatus('success');
      toast.success('WhatsApp API connection test initiated');
      
    } catch (error) {
      setVerificationStatus('error');
      toast.error('Failed to verify WhatsApp connection. Please check your credentials.');
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
        <div className="max-w-3xl mx-auto flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading WhatsApp configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Configuration</h1>
          <p className="text-muted-foreground mt-1">Connect your AiSensy WhatsApp Business API</p>
        </div>

        {verificationStatus === 'success' && (
          <Alert className="mb-6 border-green-600 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Connection Verified</AlertTitle>
            <AlertDescription>
              Your AiSensy WhatsApp Business API connection is working correctly.
            </AlertDescription>
          </Alert>
        )}

        {verificationStatus === 'error' && (
          <Alert className="mb-6 border-destructive" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>
              Unable to connect to AiSensy WhatsApp Business API. Please check your credentials and try again.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle>WhatsApp Integration</AlertTitle>
          <AlertDescription>
            <p>Once configured, the system will automatically send WhatsApp messages to your learners when they register and when courses are assigned. Messages will be sent at 10:00 AM on the scheduled start date.</p>
          </AlertDescription>
        </Alert>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>AiSensy WhatsApp API Settings</CardTitle>
            <CardDescription>
              Enter your AiSensy API access token to enable WhatsApp messaging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="serri_api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AiSensy Access Token</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your AiSensy access token" 
                          className="glass-input" 
                          type="password"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Your AiSensy access token from the AiSensy dashboard
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isVerifying || !isConfigured}
                    onClick={handleVerify}
                    className="sm:order-2"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                  
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="sm:order-3"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsApp;

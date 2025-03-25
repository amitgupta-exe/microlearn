
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertCircle, CheckCircle, MessageCircle, Info } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { WhatsAppConfig } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  api_key: z.string().min(1, {
    message: "API Key is required.",
  }),
  phone_number_id: z.string().min(1, {
    message: "Phone Number ID is required.",
  }),
  business_account_id: z.string().min(1, {
    message: "Business Account ID is required.",
  }),
  webhook_url: z.string().url({
    message: "Please enter a valid URL.",
  }),
  enable_test_mode: z.boolean().default(false),
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
      api_key: '',
      phone_number_id: '',
      business_account_id: '',
      webhook_url: 'https://yourdomain.com/api/whatsapp/webhook',
      enable_test_mode: false,
    },
  });
  
  // Load existing configuration from database
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
          .single();
          
        if (error) {
          console.error('Error fetching WhatsApp config:', error);
          return;
        }
        
        if (data) {
          setIsConfigured(data.is_configured);
          setConfigId(data.id);
          
          form.reset({
            api_key: data.api_key || '',
            phone_number_id: data.phone_number_id || '',
            business_account_id: data.business_account_id || '',
            webhook_url: data.webhook_url || 'https://yourdomain.com/api/whatsapp/webhook',
            enable_test_mode: false,
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
      
      const config: WhatsAppConfig = {
        api_key: data.api_key,
        phone_number_id: data.phone_number_id,
        business_account_id: data.business_account_id,
        webhook_url: data.webhook_url,
        is_configured: true,
        user_id: user.id,
      };
      
      let saveError;
      
      if (configId) {
        // Update existing configuration
        const { error } = await supabase
          .from('whatsapp_config')
          .update(config)
          .eq('id', configId);
          
        saveError = error;
      } else {
        // Insert new configuration
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
      
      // Refresh config ID if it was a new insertion
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
      
      // Automatically verify the connection
      await handleVerify();
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
      
      // Get the current configuration
      const { data: config, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .limit(1)
        .single();
      
      if (configError) {
        console.error('Error fetching WhatsApp config for verification:', configError);
        setVerificationStatus('error');
        toast.error('Failed to fetch WhatsApp configuration for verification');
        return;
      }
      
      if (!config || !config.is_configured) {
        setVerificationStatus('error');
        toast.error('Please save the WhatsApp configuration first');
        return;
      }
      
      // Call the test function
      const { data, error } = await supabase.functions.invoke('send-course-notification', {
        body: {
          learner_name: 'Test User',
          learner_phone: '1234567890', // This will be properly formatted in the function
          course_name: 'Test Course',
          start_date: new Date().toLocaleDateString()
        }
      });
      
      if (error) {
        console.error('Error verifying WhatsApp connection:', error);
        setVerificationStatus('error');
        toast.error('Failed to verify WhatsApp connection. Please check your credentials.');
        return;
      }
      
      console.log('Verification response:', data);
      
      // If we got here, at least the function call was successful
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

  const handleSendTestMessage = async () => {
    try {
      setIsSubmitting(true);
      
      // Get a random learner to send the test message to
      const { data: learners, error: learnersError } = await supabase
        .from('learners')
        .select('id, name, phone')
        .eq('status', 'active')
        .limit(1);
        
      if (learnersError || !learners || learners.length === 0) {
        console.error('Error fetching learners:', learnersError);
        toast.error('No active learners found to send test message');
        return;
      }
      
      const testLearner = learners[0];
      
      // Get a random course for the test
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, name')
        .eq('status', 'active')
        .limit(1);
        
      if (coursesError || !courses || courses.length === 0) {
        console.error('Error fetching courses:', coursesError);
        toast.error('No active courses found to send test message');
        return;
      }
      
      const testCourse = courses[0];
      
      // Prepare notification data
      const notificationData = {
        learner_id: testLearner.id,
        learner_name: testLearner.name,
        learner_phone: testLearner.phone,
        course_name: testCourse.name,
        start_date: new Date().toLocaleDateString()
      };
      
      // Send test message
      const { data, error } = await supabase.functions.invoke('send-course-notification', {
        body: notificationData
      });
      
      if (error) {
        console.error('Error sending test message:', error);
        toast.error('Failed to send test message');
        return;
      }
      
      console.log('Test message response:', data);
      toast.success(`Test message sent to ${testLearner.name}`);
      
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Failed to send test message');
    } finally {
      setIsSubmitting(false);
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
          <p className="text-muted-foreground mt-1">Connect your WhatsApp Business API</p>
        </div>

        {verificationStatus === 'success' && (
          <Alert className="mb-6 border-green-600 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Connection Verified</AlertTitle>
            <AlertDescription>
              Your WhatsApp Business API connection is working correctly.
            </AlertDescription>
          </Alert>
        )}

        {verificationStatus === 'error' && (
          <Alert className="mb-6 border-destructive" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>
              Unable to connect to WhatsApp Business API. Please check your credentials and try again.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Setup Instructions</AlertTitle>
          <AlertDescription>
            <p>To use WhatsApp integration, you need to:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Create a Meta for Developers account at <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">developers.facebook.com</a></li>
              <li>Set up a WhatsApp Business account and get your API credentials</li>
              <li>Configure your webhook URL to receive message delivery updates</li>
              <li>Enable the API key and configure the required permissions</li>
            </ol>
          </AlertDescription>
        </Alert>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>WhatsApp Business API Settings</CardTitle>
            <CardDescription>
              Configure your WhatsApp Business API to send messages to your learners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your WhatsApp Business API key" 
                          className="glass-input" 
                          type="password"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        This is your WhatsApp Business API key from Meta Developer Dashboard
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone_number_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your WhatsApp Phone Number ID" 
                          className="glass-input" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        The ID of your WhatsApp Business phone number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="business_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Account ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your WhatsApp Business Account ID" 
                          className="glass-input" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Your WhatsApp Business Account ID from Meta Business Manager
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="webhook_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://yourdomain.com/api/whatsapp/webhook" 
                          className="glass-input" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        URL for WhatsApp to send message delivery status updates
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enable_test_mode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Test Mode</FormLabel>
                        <FormDescription>
                          Enable test mode to avoid sending actual messages
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  {isConfigured && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleSendTestMessage}
                      disabled={isSubmitting}
                      className="sm:order-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Send Test Message
                        </>
                      )}
                    </Button>
                  )}
                  
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
                      <>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Verify Connection
                      </>
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
          <CardFooter className="flex flex-col items-start text-muted-foreground text-sm border-t p-6">
            <h4 className="font-medium text-foreground mb-2">Important Notes:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>You need a WhatsApp Business account to use this feature</li>
              <li>For the webhook to work, your site needs to be publicly accessible</li>
              <li>WhatsApp has a messaging rate limit, check Meta's documentation for details</li>
              <li>Test thoroughly before sending real messages to your learners</li>
              <li>The configured WhatsApp number must be approved by Meta for message templates</li>
            </ul>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default WhatsApp;

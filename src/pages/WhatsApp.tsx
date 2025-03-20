
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertCircle, CheckCircle, MessageCircle } from 'lucide-react';

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
  const [isConfigured, setIsConfigured] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | null>(null);
  
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

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const config: WhatsAppConfig = {
        api_key: data.api_key,
        phone_number_id: data.phone_number_id,
        business_account_id: data.business_account_id,
        webhook_url: data.webhook_url,
        is_configured: true,
      };
      
      // Here you would save the config to your database
      console.log('WhatsApp Configuration saved:', config);
      
      setIsConfigured(true);
      toast.success('WhatsApp configuration saved successfully');
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
      // Simulating API call to verify WhatsApp connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful verification
      setVerificationStatus('success');
      toast.success('WhatsApp API connection verified successfully');
    } catch (error) {
      setVerificationStatus('error');
      toast.error('Failed to verify WhatsApp connection. Please check your credentials.');
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

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
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isVerifying || !isConfigured}
                    onClick={handleVerify}
                    className="sm:order-1"
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
                    className="sm:order-2"
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
              <li>Your webhook URL must be publicly accessible</li>
              <li>WhatsApp has a messaging rate limit, check Meta's documentation for details</li>
              <li>Test thoroughly using the test mode before sending real messages</li>
            </ul>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default WhatsApp;

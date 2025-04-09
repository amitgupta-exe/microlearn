
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Learner } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
});

interface LearnerFormProps {
  learner?: Learner;
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
  onCancel: () => void;
}

const LearnerForm: React.FC<LearnerFormProps> = ({ 
  learner,
  onSubmit,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: learner?.name || '',
      email: learner?.email || '',
      phone: learner?.phone || '',
    },
  });

  const sendWelcomeMessage = async (learnerId: string, name: string, phone: string) => {
    try {
      // Only send welcome message for new learners (not when updating)
      if (!learner) {
        await supabase.functions.invoke('send-course-notification', {
          body: {
            learner_id: learnerId,
            learner_name: name,
            learner_phone: phone,
            type: 'welcome'
          }
        });
        console.log('Welcome message sent successfully');
      }
    } catch (error) {
      console.error('Error sending welcome message:', error);
      // We don't want to fail the whole operation if just the welcome message fails
      toast.error('Learner created but welcome message could not be sent');
    }
  };

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      
      // If this is a creation (not update), send welcome message
      if (!learner) {
        // Get the newly created learner's ID from the Learners component
        const { data: newLearners, error } = await supabase
          .from('learners')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!error && newLearners && newLearners.length > 0) {
          await sendWelcomeMessage(newLearners[0].id, data.name, data.phone);
        }
      }
      
      toast.success(`Learner ${learner ? 'updated' : 'created'} successfully`);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 animate-scale-in">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter learner's full name" 
                    className="glass-input" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="Enter email address" 
                    className="glass-input" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter phone number" 
                    className="glass-input" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {learner ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              learner ? 'Update Learner' : 'Create Learner'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LearnerForm;

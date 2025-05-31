
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WatiConfig {
  id: string;
  serri_endpoint: string;
  serri_api_key: string;
  is_configured: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const WhatsApp: React.FC = () => {
  const [config, setConfig] = useState<WatiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchConfig();
  }, [user]);

  const fetchConfig = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const configData: WatiConfig = {
          ...data,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
        setConfig(configData);
        setApiKey(configData.serri_api_key);
        setEndpoint(configData.serri_endpoint);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp config:', error);
      toast.error('Failed to load WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!user || !apiKey.trim() || !endpoint.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const configData = {
        serri_api_key: apiKey.trim(),
        serri_endpoint: endpoint.trim(),
        is_configured: true,
        user_id: user.id,
      };

      if (config) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_config')
          .insert(configData);

        if (error) throw error;
      }

      toast.success('WhatsApp configuration saved successfully!');
      await fetchConfig();
    } catch (error: any) {
      console.error('Error saving WhatsApp config:', error);
      toast.error(`Failed to save configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">WhatsApp Configuration</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {config?.is_configured ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              WATI Integration
            </CardTitle>
            <CardDescription>
              Configure your WATI (WhatsApp Business API) integration to send automated messages to learners.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {config?.is_configured && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  WhatsApp integration is configured and ready to use.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="endpoint">WATI Endpoint</Label>
                <Input
                  id="endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="Enter your WATI endpoint URL"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your WATI API key"
                  className="mt-1"
                />
              </div>
            </div>

            <Button 
              onClick={saveConfig} 
              disabled={saving || !apiKey.trim() || !endpoint.trim()}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need a WATI account and API access to use WhatsApp messaging features. 
                Visit <a href="https://wati.io" target="_blank" rel="noopener noreferrer" className="underline">wati.io</a> to get started.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsApp;

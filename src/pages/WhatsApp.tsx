
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const WhatsApp: React.FC = () => {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!endpoint.trim() || !apiKey.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // For now, just save to localStorage since we don't have the whatsapp_config table
      localStorage.setItem('whatsapp_config', JSON.stringify({
        serri_endpoint: endpoint,
        serri_api_key: apiKey,
        is_configured: true
      }));
      
      setIsConfigured(true);
      toast.success('WhatsApp configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!isConfigured) {
      toast.error('Please save configuration first');
      return;
    }

    toast.success('Test connection functionality coming soon!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">WhatsApp Configuration</h1>
          <p className="text-muted-foreground">
            Configure your WhatsApp integration settings to enable course notifications.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>WATI Configuration</CardTitle>
            <CardDescription>
              Enter your WATI endpoint and API key to enable WhatsApp messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="endpoint">WATI Endpoint</Label>
              <Input
                id="endpoint"
                type="text"
                placeholder="your-instance.wati.io"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apikey">API Key</Label>
              <Input
                id="apikey"
                type="password"
                placeholder="Enter your WATI API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="configured"
                checked={isConfigured}
                onCheckedChange={setIsConfigured}
              />
              <Label htmlFor="configured">Configuration enabled</Label>
            </div>

            {isConfigured && (
              <Alert>
                <AlertDescription>
                  WhatsApp integration is configured and ready to use.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button variant="outline" onClick={handleTestConnection}>
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsApp;

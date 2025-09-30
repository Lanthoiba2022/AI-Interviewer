import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { validateApiKeys, API_CONFIG } from '@/config/api';

interface ApiKeyValidatorProps {
  onValidationComplete: (isValid: boolean) => void;
}

const ApiKeyValidator = ({ onValidationComplete }: ApiKeyValidatorProps) => {
  const [validation, setValidation] = useState(validateApiKeys());
  const [apiKey, setApiKey] = useState(API_CONFIG.ASSEMBLYAI_API_KEY);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleApiKeyUpdate = () => {
    if (!apiKey.trim()) return;
    
    setIsUpdating(true);
    // Update the API key in the configuration
    (window as any).VITE_ASSEMBLYAI_API_KEY = apiKey;
    
    // Re-validate
    setTimeout(() => {
      const newValidation = validateApiKeys();
      setValidation(newValidation);
      onValidationComplete(newValidation.isValid);
      setIsUpdating(false);
    }, 1000);
  };

  const openAssemblyAI = () => {
    window.open('https://www.assemblyai.com/', '_blank');
  };

  if (validation.isValid) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            All API keys are configured correctly!
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span>API Configuration Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {validation.issues.map((issue, index) => (
                <div key={index} className="text-sm">{issue}</div>
              ))}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="api-key">AssemblyAI API Key</Label>
            <div className="flex space-x-2">
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your AssemblyAI API key"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={openAssemblyAI}
                className="flex items-center space-x-1"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Get Key</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your free API key from AssemblyAI. It's required for voice input functionality.
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleApiKeyUpdate}
              disabled={!apiKey.trim() || isUpdating}
              className="flex-1"
            >
              {isUpdating ? 'Updating...' : 'Update API Key'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onValidationComplete(false)}
            >
              Continue Without Voice
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Note:</strong> Without AssemblyAI API key, voice input will be disabled.</p>
            <p>You can still use the application with text input only.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeyValidator;

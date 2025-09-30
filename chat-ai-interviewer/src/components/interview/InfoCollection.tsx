import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setCandidate, setStage, addChatMessage } from '@/store/slices/interviewSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '@/services/speechService';

const InfoCollection = () => {
  const dispatch = useDispatch();
  const { currentCandidate, missingFields, chatHistory } = useSelector((state: RootState) => state.interview);
  const [currentField, setCurrentField] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [fieldIndex, setFieldIndex] = useState(0);

  // Speech-to-text hook
  const { 
    isRecording, 
    transcript, 
    isListening, 
    hasValidApiKey,
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechToText();

  useEffect(() => {
    if (missingFields.length > 0 && fieldIndex < missingFields.length) {
      const field = missingFields[fieldIndex];
      setCurrentField(field);
      
      // Add AI message asking for the field
      const fieldLabels = {
        name: 'your full name',
        email: 'your email address',
        phone: 'your phone number'
      };
      
      dispatch(addChatMessage({
        type: 'ai',
        content: `What is ${fieldLabels[field as keyof typeof fieldLabels]}?`,
      }));
    }
  }, [fieldIndex, missingFields, dispatch]);

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Stop voice recording if active
    if (isRecording) {
      stopListening();
    }

    // Add user message
    dispatch(addChatMessage({
      type: 'user',
      content: inputValue.trim(),
    }));

    // Update candidate info
    dispatch(setCandidate({
      [currentField]: inputValue.trim(),
    }));

    // Move to next field or start interview
    if (fieldIndex < missingFields.length - 1) {
      setFieldIndex(fieldIndex + 1);
      setInputValue('');
      resetTranscript();
    } else {
      // All fields collected, start interview
      dispatch(addChatMessage({
        type: 'ai',
        content: `Perfect! I now have all your information. Let's begin your interview for the Full Stack Developer position. Are you ready to start?`,
      }));
      
      setTimeout(() => {
        dispatch(setStage('interview'));
      }, 1000);
    }
  };

  const getFieldLabel = (field: string) => {
    const labels = {
      name: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number'
    };
    return labels[field as keyof typeof labels] || field;
  };

  const getPlaceholder = (field: string) => {
    const placeholders = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567'
    };
    return placeholders[field as keyof typeof placeholders] || '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Complete Your Profile</h2>
        <p className="text-muted-foreground">
          Progress: {fieldIndex + 1} of {missingFields.length} fields
        </p>
      </div>

      {/* Chat History */}
      <Card className="max-h-96 overflow-y-auto">
        <CardContent className="p-4 space-y-4">
          {chatHistory.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-chat-user text-chat-user-foreground ml-4'
                    : message.type === 'ai'
                    ? 'bg-chat-ai text-chat-ai-foreground mr-4'
                    : 'bg-accent text-accent-foreground mx-4 text-center text-sm'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Input Form */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="field-input" className="text-sm font-medium">
                {getFieldLabel(currentField)}
              </Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="field-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder(currentField)}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={!inputValue.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Voice Controls */}
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={isRecording ? stopListening : startListening}
                  disabled={!hasValidApiKey}
                  className="flex items-center space-x-2"
                  title={!hasValidApiKey ? "AssemblyAI API key required for voice input" : ""}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>
                    {!hasValidApiKey ? 'Voice Disabled' : isRecording ? 'Stop Recording' : 'Voice Input'}
                  </span>
                </Button>
                
                {transcript && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetTranscript}
                    className="text-xs"
                  >
                    Clear Voice
                  </Button>
                )}
                
                {isRecording && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-sm">Recording...</span>
                  </div>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Current candidate info preview */}
      {currentCandidate && (
        <Card className="bg-accent/50">
          <CardContent className="p-4">
            <h3 className="font-medium text-sm text-accent-foreground mb-2">Current Information:</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>Name: {currentCandidate.name || 'Not provided'}</div>
              <div>Email: {currentCandidate.email || 'Not provided'}</div>
              <div>Phone: {currentCandidate.phone || 'Not provided'}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InfoCollection;
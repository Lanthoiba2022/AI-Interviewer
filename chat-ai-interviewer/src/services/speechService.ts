// Speech-to-Text Service using AssemblyAI
import { useState, useCallback } from 'react';
import { API_CONFIG } from '@/config/api';

export interface STTConfig {
  apiKey: string;
  sampleRate: number;
  channels: number;
}

export interface STTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

class SpeechToTextService {
  private ws: WebSocket | null = null;
  private isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private config: STTConfig;

  constructor(config: STTConfig) {
    this.config = config;
  }

  // Check if API key is valid
  isApiKeyValid(): boolean {
    return this.config.apiKey && 
           this.config.apiKey !== 'your_assemblyai_api_key_here' && 
           this.config.apiKey.length > 10;
  }

  // Initialize microphone access
  async initializeMicrophone(): Promise<MediaStream> {
    if (!this.isApiKeyValid()) {
      throw new Error('AssemblyAI API key is required for voice input. Please configure your API key.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      return stream;
    } catch (error) {
      console.error('Microphone access denied:', error);
      throw new Error('Microphone access is required for voice input');
    }
  }

  // Start recording and transcription
  async startTranscription(
    onResult: (result: STTResult) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.isApiKeyValid()) {
      onError(new Error('AssemblyAI API key is required for voice input. Please configure your API key.'));
      return;
    }

    try {
      const stream = await this.initializeMicrophone();
      
      // Set up MediaRecorder for audio capture
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };

      // Fallback if opus is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          // Send audio data immediately for real-time processing
          this.sendAudioData(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processAudioChunks(onResult, onError);
      };

      // Set up WebSocket connection to AssemblyAI first
      this.setupWebSocketConnection(onResult, onError);

      // Start recording after WebSocket is ready
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.mediaRecorder.start(100); // Collect data every 100ms for real-time
          this.isRecording = true;
        }
      }, 1000);

    } catch (error) {
      onError(error as Error);
    }
  }

  // Set up WebSocket connection to AssemblyAI
  private setupWebSocketConnection(
    onResult: (result: STTResult) => void,
    onError: (error: Error) => void
  ): void {
    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${this.config.sampleRate}&format_turns=true&token=${this.config.apiKey}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connection opened');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'Turn') {
          const result: STTResult = {
            text: data.transcript || '',
            confidence: data.confidence || 0,
            isFinal: data.turn_is_formatted || false
          };
          onResult(result);
        } else if (data.type === 'Begin') {
          console.log('STT session started:', data.id);
        } else if (data.type === 'Termination') {
          console.log('STT session ended');
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError(new Error('Speech recognition connection failed'));
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      if (event.code !== 1000) {
        onError(new Error('Speech recognition connection lost'));
      }
    };
  }

  // Send audio data to AssemblyAI in real-time
  private async sendAudioData(audioBlob: Blob): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      this.ws.send(audioData);
    } catch (error) {
      console.error('Error sending audio data:', error);
    }
  }

  // Process audio chunks and send to AssemblyAI
  private async processAudioChunks(
    onResult: (result: STTResult) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (this.audioChunks.length === 0) return;

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);

      // Send raw audio data directly to WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(audioData);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      onError(new Error('Failed to process audio data'));
    }
  }

  // Stop recording and transcription
  stopTranscription(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Check if currently recording
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  // Clean up resources
  cleanup(): void {
    this.stopTranscription();
    this.audioChunks = [];
  }
}

// Create singleton instance
export const speechService = new SpeechToTextService({
  apiKey: API_CONFIG.ASSEMBLYAI_API_KEY,
  sampleRate: 16000,
  channels: 1
});

// Hook for React components
export const useSpeechToText = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasValidApiKey, setHasValidApiKey] = useState(speechService.isApiKeyValid());

  const startListening = useCallback(async () => {
    if (!hasValidApiKey) {
      console.warn('AssemblyAI API key is not configured. Voice input is disabled.');
      return;
    }

    try {
      setIsRecording(true);
      setIsListening(true);
      setTranscript('');

      await speechService.startTranscription(
        (result) => {
          setTranscript(result.text);
          if (result.isFinal) {
            setIsListening(false);
          }
        },
        (error) => {
          console.error('STT Error:', error);
          setIsRecording(false);
          setIsListening(false);
        }
      );
    } catch (error) {
      console.error('Failed to start listening:', error);
      setIsRecording(false);
      setIsListening(false);
    }
  }, [hasValidApiKey]);

  const stopListening = useCallback(() => {
    speechService.stopTranscription();
    setIsRecording(false);
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isRecording,
    transcript,
    isListening,
    hasValidApiKey,
    startListening,
    stopListening,
    resetTranscript
  };
};


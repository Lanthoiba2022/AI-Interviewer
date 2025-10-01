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
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
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

      // Set up WebSocket connection to AssemblyAI first
      this.setupWebSocketConnection(onResult, onError);

      // Start audio processing when socket is open
      const startAudio = () => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
        // Use small buffer for low-latency; 4096 works widely
        this.processor = this.audioContext.createScriptProcessor(4096, this.config.channels, this.config.channels);

        this.processor.onaudioprocess = (e) => {
          if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          // Downsample from context sampleRate (e.g., 44100) to 16000 PCM16LE
          const pcm16 = this.downsampleToPCM16(inputData, this.audioContext!.sampleRate, this.config.sampleRate);
          const base64 = this.arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
          try {
            this.ws.send(JSON.stringify({ audio_data: base64 }));
          } catch {}
        };

        this.sourceNode.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
        this.isRecording = true;
      };

      // If already open, start immediately; else wait for onopen
      if (this.ws && this.ws.readyState === WebSocket.OPEN) startAudio();
      else {
        const readyCheck = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            clearInterval(readyCheck);
            startAudio();
          }
        }, 100);
      }

    } catch (error) {
      onError(error as Error);
    }
  }

  // Set up WebSocket connection to AssemblyAI
  private setupWebSocketConnection(
    onResult: (result: STTResult) => void,
    onError: (error: Error) => void
  ): void {
    const params = new URLSearchParams({
      sample_rate: String(this.config.sampleRate),
      format_turns: 'true',
      end_of_turn_confidence_threshold: '0.7',
      min_end_of_turn_silence_when_confident: '160',
      max_turn_silence: '2400',
      token: this.config.apiKey,
    });
    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?${params.toString()}`;

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

  // Utilities: audio conversion and base64 encoding
  private downsampleToPCM16(input: Float32Array, inputRate: number, outRate: number): Int16Array {
    if (outRate === inputRate) {
      return this.floatTo16BitPCM(input);
    }
    const ratio = inputRate / outRate;
    const newLength = Math.round(input.length / ratio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
        accum += input[i];
        count++;
      }
      result[offsetResult] = Math.max(-1, Math.min(1, accum / count)) * 0x7fff;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // Stop recording and transcription
  stopTranscription(): void {
    this.isRecording = false;
    if (this.processor) { try { this.processor.disconnect(); } catch {} this.processor = null; }
    if (this.sourceNode) { try { this.sourceNode.disconnect(); } catch {} this.sourceNode = null; }
    if (this.audioContext) { try { this.audioContext.close(); } catch {} this.audioContext = null; }
    if (this.ws) {
      try { this.ws.send(JSON.stringify({ terminate_session: true })); } catch {}
      try { this.ws.close(); } catch {}
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


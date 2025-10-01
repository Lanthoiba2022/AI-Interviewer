// Text-to-Speech Service
import { BaseAIService } from './BaseAIService';
import { API_CONFIG } from '@/config/api';

export class TTSService extends BaseAIService {
  // Convert text to speech using Puter
  async textToSpeech(text: string): Promise<HTMLAudioElement> {
    await this.waitForPuter();

    try {
      console.log('Converting to speech:', text.substring(0, 100) + '...');
      
      let audio: HTMLAudioElement;
      try {
        audio = await this.puter.ai.txt2speech(text, {
          voice: API_CONFIG.TTS_VOICE,
          engine: API_CONFIG.TTS_ENGINE,
          language: API_CONFIG.TTS_LANGUAGE
        });
      } catch (primaryError) {
        console.warn('Primary TTS failed, retrying with defaults:', primaryError);
        audio = await this.puter.ai.txt2speech(text, {
          voice: 'Joanna',
          engine: 'generative',
          language: 'en-US'
        });
      }

      // Some browsers block autoplay; ensure we attempt play on user gesture elsewhere
      try {
        await audio.play();
      } catch (err) {
        console.warn('Autoplay prevented, returning audio element for manual play', err);
      }

      console.log('TTS audio created successfully');
      return audio;
    } catch (error) {
      console.error('TTS error:', error);
      // Return null to indicate TTS failure
      return null;
    }
  }
}

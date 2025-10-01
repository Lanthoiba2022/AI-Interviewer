// Base AI Service with common functionality for Puter AI integration
import { API_CONFIG } from '@/config/api';

declare global {
  interface Window {
    puter: any;
  }
}

export class BaseAIService {
  protected puter: any;

  constructor() {
    this.puter = window.puter;
    this.initializeAuth();
  }

  private initializeAuth(): void {
    try {
      const token = API_CONFIG.PUTER_TOKEN as any;
      if (this.puter && token) {
        // Common token application patterns (SDK evolves):
        if (typeof this.puter.auth?.setToken === 'function' && token) {
          this.puter.auth.setToken(token);
        } else if (typeof this.puter.setAuthToken === 'function' && token) {
          this.puter.setAuthToken(token);
        } else if (typeof this.puter.configure === 'function') {
          this.puter.configure({ token });
        } else if (typeof this.puter.init === 'function') {
          this.puter.init({ token });
        }
      }
    } catch (e) {
      console.warn('Failed to apply Puter token from env');
    }
  }

  // Check if Puter is loaded
  isReady(): boolean {
    return !!this.puter;
  }

  // Wait for Puter to be available
  async waitForPuter(): Promise<void> {
    if (!this.puter && (window as any).puter) this.puter = (window as any).puter;
    
    // Debug logging
    console.log('Puter loaded:', !!this.puter);
  }

  // Unified chat requester with retries and flexible response parsing
  protected async chatWithRetries(messages: any[], opts?: any): Promise<string> {
    await this.waitForPuter();
    const attempts = 3;
    let lastError: any = null;
    
    const parseResponse = async (completion: any): Promise<string> => {
      let text = '';
      try {
        if (completion && typeof completion[Symbol.asyncIterator] === 'function') {
          for await (const part of completion) text += part?.text || '';
          return text;
        }
        if (completion?.text) return String(completion.text);
        if (Array.isArray(completion)) {
          const first = completion[0];
          return String(first?.text || first?.content?.[0]?.text || '');
        }
        if (completion && typeof completion === 'object') {
          return String(completion?.content?.[0]?.text || completion?.choices?.[0]?.message?.content || '');
        }
      } catch {}
      return text;
    };

    for (let i = 0; i < attempts; i++) {
      try {
        // Try stream first
        try {
          const completion = await this.puter.ai.chat(messages, { ...(opts || {}), model: API_CONFIG.PUTER_MODEL, stream: true });
          const t = await parseResponse(completion);
          if (t) return t;
        } catch (e1) {
          // Then non-stream with options
          try {
            const completion = await this.puter.ai.chat(messages, { ...(opts || {}), model: API_CONFIG.PUTER_MODEL });
            const t = await parseResponse(completion);
            if (t) return t;
          } catch (e2) {
            // Finally, bare call without opts
            const completion = await this.puter.ai.chat(messages);
            const t = await parseResponse(completion);
            if (t) return t;
            lastError = e2;
          }
          lastError = e1;
        }
      } catch (e) {
        lastError = e;
      }
      // Backoff before retry
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
    }
    throw lastError || new Error('AI request failed');
  }

  // Extract the first complete JSON array from a possibly messy string
  protected static extractFirstJsonArray(raw: string): string | null {
    if (!raw) return null;
    let t = raw.trim();
    if (t.startsWith('```')) {
      t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
    }
    let start = -1;
    let depth = 0;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (ch === '[') {
        if (start === -1) start = i;
        depth++;
      } else if (ch === ']') {
        if (depth > 0) depth--;
        if (depth === 0 && start !== -1) {
          return t.slice(start, i + 1);
        }
      }
    }
    return null;
  }
}

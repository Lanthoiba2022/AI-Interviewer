// API Configuration
export const API_CONFIG = {
  // AssemblyAI API Key
  // Get your free API key from: https://www.assemblyai.com/
  ASSEMBLYAI_API_KEY: import.meta.env.VITE_ASSEMBLYAI_API_KEY,
  
  // Puter AI is loaded via CDN, no API key needed
  PUTER_LOADED: typeof window !== 'undefined' && !!window.puter,
  // Optional: Puter auth token (JWT) if you want headless auth
  PUTER_TOKEN: import.meta.env.VITE_PUTER_TOKEN,
  // Default Puter AI model (can be overridden via .env)
  PUTER_MODEL: import.meta.env.VITE_PUTER_MODEL || 'claude-sonnet-4',
  // TTS settings (optional overrides)
  TTS_VOICE: import.meta.env.VITE_TTS_VOICE || 'Joanna',
  TTS_ENGINE: import.meta.env.VITE_TTS_ENGINE || 'generative',
  TTS_LANGUAGE: import.meta.env.VITE_TTS_LANGUAGE || 'en-US',
};

// Validate API keys
export const validateApiKeys = () => {
  const issues: string[] = [];
  
  if (!API_CONFIG.ASSEMBLYAI_API_KEY || API_CONFIG.ASSEMBLYAI_API_KEY === 'your_assemblyai_api_key_here') {
    issues.push('AssemblyAI API key is not configured. Please set VITE_ASSEMBLYAI_API_KEY in your .env file');
  }
  
  if (!API_CONFIG.PUTER_LOADED) {
    issues.push('Puter AI is not loaded. Please ensure the Puter script is included in your HTML');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

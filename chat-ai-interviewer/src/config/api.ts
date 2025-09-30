// API Configuration
export const API_CONFIG = {
  // AssemblyAI API Key
  // Get your free API key from: https://www.assemblyai.com/
  ASSEMBLYAI_API_KEY: import.meta.env.VITE_ASSEMBLYAI_API_KEY,
  
  // Puter AI is loaded via CDN, no API key needed
  PUTER_LOADED: typeof window !== 'undefined' && !!window.puter,
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

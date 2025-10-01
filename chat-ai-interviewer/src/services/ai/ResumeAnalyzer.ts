// Resume Analysis Service - Using core logic from ResumeAnalyser.js
import { BaseAIService } from './BaseAIService';

export interface ResumeAnalysis {
  name: string | null;
  email: string | null;
  phone: string | null;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  score: number;
}

export class ResumeAnalyzer extends BaseAIService {
  private tempResumePath: string | null = null;

  // Analyze resume using Puter AI - Core logic from ResumeAnalyser.js
  async analyzeResume(file: File): Promise<ResumeAnalysis> {
    // Don't require authentication for resume analysis - Puter AI works without it
    await this.waitForPuter();

    let uploadedPath: string;

    try {
      console.log('Starting resume analysis for file:', file.name);
      console.log('Puter object available:', !!this.puter);
      console.log('Puter object keys:', Object.keys(this.puter || {}));
      console.log('Puter fs object:', this.puter?.fs);
      console.log('Puter fs methods:', Object.keys(this.puter?.fs || {}));

      // Upload file to Puter - exactly like ResumeAnalyser.js
      console.log('File details - Name:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Use the exact same method as ResumeAnalyser.js
      const puterFile = await this.puter.fs.write(`temp_resume_${Date.now()}.${file.name.split('.').pop()}`, file);
      console.log('File upload response:', puterFile);
      
      uploadedPath = puterFile.path;
      this.tempResumePath = uploadedPath;
      
      console.log('File uploaded to Puter successfully:', uploadedPath);

      // Use the exact same AI analysis approach as ResumeAnalyser.js
      console.log('Starting AI chat request...');
      
      // Try direct call first (like ResumeAnalyser.js)
      try {
        const completion = await this.puter.ai.chat([
          {
            role: 'user',
            content: [
              {
                type: 'file',
                puter_path: uploadedPath
              },
              {
                type: 'text',
                text: 'Please analyze this resume and extract the following information in JSON format: {"name":"string|null","email":"string|null","phone":"string|null","strengths":["string"],"weaknesses":["string"],"summary":"string","score":number}. Extract contact information and key skills from the resume. Return only valid JSON.'
              }
            ]
          }
        ], { model: 'claude-sonnet-4', stream: true });

        console.log('AI chat request completed, processing response...');
        let responseText = '';
        for await (const part of completion) {
          responseText += part?.text || '';
        }
        
        console.log('AI Response received:', responseText.substring(0, 200) + '...');
        
        // Check if we got any response at all
        if (!responseText || responseText.trim().length === 0) {
          throw new Error('Resume Extraction is down. Proceed manually');
        }

        // Parse the response
        const analysis = this.parseAnalysis(responseText);
        
        // Check if analysis parsing completely failed (no data extracted)
        if (!analysis.name && !analysis.email && !analysis.phone && 
            analysis.strengths.length === 0 && analysis.summary === '') {
          throw new Error('Resume Extraction is down. Proceed manually');
        }
        
        // If we have some data but missing contact fields, that's a partial success
        if (!analysis.name || !analysis.email || !analysis.phone) {
          const missingFields = [];
          if (!analysis.name) missingFields.push('name');
          if (!analysis.email) missingFields.push('email');
          if (!analysis.phone) missingFields.push('phone');
          
          // Throw an error with missing fields information (no "proceed manually" toast)
          const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
          (error as any).missingFields = missingFields;
          throw error;
        }

        return analysis;
        
      } catch (directError) {
        console.log('Direct AI call failed, trying with chatWithRetries...', directError);
        
        // Fallback to chatWithRetries if direct call fails
        const responseText = await this.chatWithRetries([
          {
            role: 'user',
            content: [
              {
                type: 'file',
                puter_path: uploadedPath
              },
              {
                type: 'text',
                text: 'Please analyze this resume and extract the following information in JSON format: {"name":"string|null","email":"string|null","phone":"string|null","strengths":["string"],"weaknesses":["string"],"summary":"string","score":number}. Extract contact information and key skills from the resume. Return only valid JSON.'
              }
            ]
          }
        ]);

        console.log('AI Response received via chatWithRetries:', responseText.substring(0, 200) + '...');
        
        // Check if we got any response at all
        if (!responseText || responseText.trim().length === 0) {
          throw new Error('Resume Extraction is down. Proceed manually');
        }

        // Parse the response
        const analysis = this.parseAnalysis(responseText);
        
        // Check if analysis parsing completely failed (no data extracted)
        if (!analysis.name && !analysis.email && !analysis.phone && 
            analysis.strengths.length === 0 && analysis.summary === '') {
          throw new Error('Resume Extraction is down. Proceed manually');
        }
        
        // If we have some data but missing contact fields, that's a partial success
        if (!analysis.name || !analysis.email || !analysis.phone) {
          const missingFields = [];
          if (!analysis.name) missingFields.push('name');
          if (!analysis.email) missingFields.push('email');
          if (!analysis.phone) missingFields.push('phone');
          
          // Throw an error with missing fields information (no "proceed manually" toast)
          const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
          (error as any).missingFields = missingFields;
          throw error;
        }

        return analysis;
      }

    } catch (error) {
      console.error('Resume analysis error:', error);
      
      // If it's our validation error for missing fields, re-throw it
      if (error instanceof Error && (error as any).missingFields) {
        throw error;
      }
      
      // For all other errors (network, API failure, etc.), treat as complete failure
      throw new Error('Resume Extraction is down. Proceed manually');
    }
  }

  // Get the temporary resume path for use in other services
  getTempResumePath(): string | null {
    return this.tempResumePath;
  }

  // Parse analysis response - similar to ResumeAnalyser.js approach
  private parseAnalysis(text: string): ResumeAnalysis {
    try {
      // Clean text and extract JSON
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
      }
      
      // Find JSON object
      const start = cleanText.indexOf('{');
      const end = cleanText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        cleanText = cleanText.slice(start, end + 1);
      }

      const json = JSON.parse(cleanText);
      
      return {
        name: json.name || null,
        email: json.email || null,
        phone: json.phone || null,
        strengths: Array.isArray(json.strengths) ? json.strengths : [],
        weaknesses: Array.isArray(json.weaknesses) ? json.weaknesses : [],
        summary: json.summary || '',
        score: typeof json.score === 'number' ? json.score : 75
      };
    } catch (error) {
      console.warn('JSON parsing failed, trying to extract basic info from text');
      
      // Try to extract basic information from the text response
      const analysis: ResumeAnalysis = {
        name: null,
        email: null,
        phone: null,
        strengths: [],
        weaknesses: [],
        summary: text.substring(0, 200) + '...', // Use first 200 chars as summary
        score: 50 // Default score
      };

      // Try to extract email
      const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        analysis.email = emailMatch[0];
      }

      // Try to extract phone
      const phoneMatch = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
      if (phoneMatch) {
        analysis.phone = phoneMatch[0];
      }

      // Try to extract name (look for common patterns)
      const nameMatch = text.match(/(?:Name|Full Name|Candidate):\s*([A-Za-z\s]+)/i);
      if (nameMatch) {
        analysis.name = nameMatch[1].trim();
      }

      return analysis;
    }
  }
}

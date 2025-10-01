// Question Generation Service
import { BaseAIService } from './BaseAIService';
import { API_CONFIG } from '@/config/api';

export interface GeneratedQuestion {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question_number: number;
  question_text: string;
}

export class QuestionGenerator extends BaseAIService {
  // Parse questions from AI text with multiple fallbacks
  private static parseQuestionsFromText(text: string): GeneratedQuestion[] {
    const arr = BaseAIService.extractFirstJsonArray(text);
    if (arr) {
      try {
        const parsed = JSON.parse(arr);
        const normalizeDifficulty = (d: string): 'Easy' | 'Medium' | 'Hard' => {
          const val = (d || '').toString().trim().toLowerCase();
          if (val === 'easy') return 'Easy';
          if (val === 'medium') return 'Medium';
          return 'Hard';
        };
        return parsed.map((q: any, i: number) => ({
          difficulty: normalizeDifficulty(q.difficulty || q.level || q.type),
          question_number: q.question_number || q.number || i + 1,
          question_text: q.question_text || q.text || q.question || String(q)
        }));
      } catch {}
    }

    // Fallback: parse numbered lines "1. ..."
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const numbered = lines.filter(l => /^\d+\./.test(l)).slice(0, 6);
    if (numbered.length >= 6) {
      const template: Array<'Easy'|'Medium'|'Hard'> = ['Easy','Easy','Medium','Medium','Hard','Hard'];
      return numbered.map((l, i) => ({
        difficulty: template[i],
        question_number: i + 1,
        question_text: l.replace(/^\d+\.\s*/, '')
      }));
    }

    // Last-resort static set to keep flow unblocked
    const fallback: GeneratedQuestion[] = [
      { difficulty: 'Easy', question_number: 1, question_text: 'Explain the difference between var, let, and const in JavaScript.' },
      { difficulty: 'Easy', question_number: 2, question_text: 'What are React hooks and why are they useful?' },
      { difficulty: 'Medium', question_number: 3, question_text: 'How would you design a REST API for a todo app? Outline endpoints and status codes.' },
      { difficulty: 'Medium', question_number: 4, question_text: 'Describe the event loop in Node.js and how it handles async I/O.' },
      { difficulty: 'Hard', question_number: 5, question_text: 'Given a slow React list rendering 10k items, propose optimizations with code snippets.' },
      { difficulty: 'Hard', question_number: 6, question_text: 'Design a scalable file upload service in Node.js with retries and chunking.' }
    ];
    return fallback;
  }

  // Generate interview questions using Puter AI
  async generateQuestions(): Promise<GeneratedQuestion[]> {
    await this.waitForPuter();

    try {
      const completion = await this.puter.ai.chat([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Generate exactly 6 interview questions for a Full Stack Developer (React + Node.js). Strict order: 2 Easy, 2 Medium, 2 Hard. Keep them concise and practical (React, Node.js, JavaScript, APIs, full-stack best practices). Return ONLY a JSON array (no prose, no code fences) of objects: {"difficulty":"Easy|Medium|Hard","question_number":1-6,"question_text":"string"}.'
            }
          ]
        }
      ], { model: API_CONFIG.PUTER_MODEL, stream: true });

      let responseText = '';
      for await (const part of completion) {
        responseText += part?.text || '';
      }

      // Parse response via robust helper
      try {
        return QuestionGenerator.parseQuestionsFromText(responseText);
      } catch (parseError) {
        throw parseError as Error;
      }
    } catch (error) {
      console.error('Question generation error:', error);
      throw new Error('Failed to generate questions.');
    }
  }

  // Generate interview questions based on cached resume analysis
  async generateQuestionsFromResume(resumeAnalysis: any, tempResumePath?: string | null): Promise<GeneratedQuestion[]> {
    await this.waitForPuter();

    try {
      const contentParts: any[] = [];
      if (tempResumePath) {
        contentParts.push({ type: 'file', puter_path: tempResumePath });
      }
      contentParts.push({
        type: 'text',
        text: `Generate exactly 6 personalized interview questions for a Full Stack Developer (React + Node.js) role.
Use both the attached resume (if provided) and this analysis:
Candidate Name: ${resumeAnalysis.name || 'Not provided'}
Strengths: ${resumeAnalysis.strengths?.join(', ') || 'Not specified'}
Weaknesses: ${resumeAnalysis.weaknesses?.join(', ') || 'Not specified'}
Summary: ${resumeAnalysis.summary || 'Not available'}

Rules:
- Strict order: 2 Easy, 2 Medium, 2 Hard
- Concise and practical; focus on React, Node.js, JavaScript, APIs, full-stack practices
Output ONLY a JSON array (no prose, no code fences) of {"difficulty":"Easy|Medium|Hard","question_number":1-6,"question_text":"string"}`
      });

      const completion = await this.puter.ai.chat([
        { role: 'user', content: contentParts }
      ], { model: API_CONFIG.PUTER_MODEL, stream: true });

      let responseText = '';
      for await (const part of completion) {
        responseText += part?.text || '';
      }

      // Parse response with robust extractor + one retry if needed
      try {
        return QuestionGenerator.parseQuestionsFromText(responseText);
      } catch (parseError) {
        console.warn('First parse failed, retrying personalized generation without file...');
        // Retry once without file attachment to minimize chance of long text wrapping
        const retryCompletion = await this.puter.ai.chat([
          { role: 'user', content: [{
            type: 'text',
            text: `Generate exactly 6 personalized interview questions for a Full Stack Developer (React + Node.js) role based on this analysis only (no file):\nName: ${resumeAnalysis.name || 'Not provided'}\nStrengths: ${resumeAnalysis.strengths?.join(', ') || 'Not specified'}\nWeaknesses: ${resumeAnalysis.weaknesses?.join(', ') || 'Not specified'}\nSummary: ${resumeAnalysis.summary || 'Not available'}\nRules: 2 Easy, 2 Medium, 2 Hard; concise and practical; Output ONLY JSON array (no code fences) of {"difficulty":"Easy|Medium|Hard","question_number":1-6,"question_text":"string"}`
          }]} ] , { model: API_CONFIG.PUTER_MODEL, stream: true });
        let retryText = '';
        for await (const part of retryCompletion) retryText += part?.text || '';
        return QuestionGenerator.parseQuestionsFromText(retryText);
      }
    } catch (error) {
      console.error('Personalized question generation error:', error);
      throw new Error('Failed to generate personalized questions.');
    }
  }
}

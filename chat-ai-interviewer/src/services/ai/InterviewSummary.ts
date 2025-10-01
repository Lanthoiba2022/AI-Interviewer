// Interview Summary Service
import { BaseAIService } from './BaseAIService';
import { API_CONFIG } from '@/config/api';

export class InterviewSummary extends BaseAIService {
  // Generate final interview summary using Puter AI
  async generateFinalSummary(candidate: any, questions: any[], answers: any[]): Promise<string> {
    await this.waitForPuter();

    try {
      const completion = await this.puter.ai.chat([
        {
          role: 'user',
          content: `Please provide a comprehensive interview summary for this Full Stack Developer candidate.

Candidate: ${candidate.name}
Email: ${candidate.email}

Interview Performance:
${questions.map((q, i) => `Q${i + 1} (${q.difficulty}): ${q.text}
Answer: ${answers[i]?.answer || 'No answer'}
Score: ${answers[i]?.score || 0}%`).join('\n\n')}

Provide a professional summary (2-3 paragraphs) covering:
1. Overall performance and technical competency
2. Key strengths demonstrated
3. Areas for improvement
4. Recommendation for the role`
        }
      ], { model: API_CONFIG.PUTER_MODEL, stream: true });

      let responseText = '';
      for await (const part of completion) {
        responseText += part?.text || '';
      }

      return responseText || 'Interview completed successfully. Candidate demonstrated technical knowledge and problem-solving skills.';
    } catch (error) {
      console.error('Summary generation error:', error);
      return 'Interview completed. Detailed summary unavailable at this time.';
    }
  }
}

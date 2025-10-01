// Answer Evaluation Service
import { BaseAIService } from './BaseAIService';
import { API_CONFIG } from '@/config/api';

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  conciseAnswer?: string;
}

export class AnswerEvaluator extends BaseAIService {
  // Evaluate answer using Puter AI
  async evaluateAnswer(question: string, answer: string, difficulty: string): Promise<AnswerEvaluation> {
    await this.waitForPuter();

    try {
      const completion = await this.puter.ai.chat([
        {
          role: 'user',
          content: `Please evaluate this interview answer for a Full Stack Developer position. Use a strict rubric:
If the answer is blank, "I don't know", "no idea", or similar, assign a score between 0 and 10.
If the answer is partially correct with gaps, assign 40–60 depending on completeness.
If the answer is largely correct but missing minor details, assign 70–85.
Only assign 90+ if the answer is fully correct, clearly reasoned, and aligned to difficulty level.

Question (${difficulty}): ${question}
Answer: ${answer}

Provide a detailed evaluation with:
1. A score out of 100
2. Specific feedback on what was good and what could be improved
3. 2-3 key strengths shown in the answer
4. 2-3 areas for improvement
5. A concise correct answer (1-3 sentences) suitable for this difficulty level

Always include the corrected/ideal answer regardless of candidate response.
Return the response in this JSON format:
{
  "score": 85,
  "feedback": "detailed feedback",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "concise_answer": "a short, correct answer no deeper than needed"
}`
        }
      ], { model: API_CONFIG.PUTER_MODEL, stream: true });

      let responseText = '';
      for await (const part of completion) {
        responseText += part?.text || '';
      }

      // Parse JSON response
      try {
        // Normalize common wrappers like code fences and extract first JSON object
        const cleanText = (() => {
          let t = (responseText || '').trim();
          if (!t) return t;
          // Remove surrounding code fences if present
          if (t.startsWith('```')) {
            t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
          }
          // Try brace matching to isolate JSON object
          const start = t.indexOf('{');
          const end = t.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            return t.slice(start, end + 1);
          }
          return t;
        })();

        const evaluation = JSON.parse(cleanText);
        return {
          score: evaluation.score || 0,
          feedback: evaluation.feedback || 'No specific feedback available',
          strengths: evaluation.strengths || [],
          improvements: evaluation.improvements || [],
          conciseAnswer: evaluation.concise_answer || evaluation.conciseAnswer || ''
        };
      } catch (parseError) {
        throw parseError as Error;
      }
    } catch (error) {
      console.error('Answer evaluation error:', error);
      throw new Error('Failed to evaluate answer.');
    }
  }
}

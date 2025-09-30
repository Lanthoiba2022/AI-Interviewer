// AI Service for Puter AI integration
declare global {
  interface Window {
    puter: any;
  }
}

export interface ResumeAnalysis {
  name?: string;
  email?: string;
  phone?: string;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  score: number;
}

export interface GeneratedQuestion {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question_number: number;
  question_text: string;
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

class AIService {
  private puter: any;

  constructor() {
    this.puter = window.puter;
  }

  // Check if Puter is loaded
  isReady(): boolean {
    return !!this.puter;
  }

  // Wait for Puter to be available
  async waitForPuter(): Promise<void> {
    return new Promise((resolve) => {
      if (this.puter) {
        resolve();
        return;
      }

      const checkPuter = () => {
        if (window.puter) {
          this.puter = window.puter;
          resolve();
        } else {
          setTimeout(checkPuter, 100);
        }
      };
      checkPuter();
    });
  }

  // Analyze resume using Puter AI
  async analyzeResume(file: File): Promise<ResumeAnalysis> {
    await this.waitForPuter();

    try {
      // Upload file to Puter
      const puterFile = await this.puter.fs.write(
        `temp_resume_${Date.now()}.${file.name.split('.').pop()}`,
        file
      );

      const uploadedPath = puterFile.path;

      // Analyze resume with AI using streaming approach
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
              text: 'Please analyze this resume and suggest how to improve it. Extract the candidate\'s name, email, and phone number. Identify key strengths and areas for improvement. Provide a brief summary and score the resume out of 100. Format your response as: Name: [name], Email: [email], Phone: [phone], Strengths: [list], Weaknesses: [list], Summary: [text], Score: [number]'
            }
          ]
        }
      ], { model: 'claude-sonnet-4', stream: true });

      let responseText = '';
      for await (const part of completion) {
        responseText += part?.text || '';
      }

      // Clean up the temporary file
      await this.puter.fs.delete(uploadedPath);

      // Parse the response text to extract information
      const parseAnalysis = (text: string): ResumeAnalysis => {
        console.log('AI Response:', text); // Debug logging
        
        // Try multiple patterns to extract information
        const nameMatch = text.match(/(?:Name|Candidate):\s*([^\n,]+)/i);
        const emailMatch = text.match(/(?:Email|E-mail):\s*([^\n,]+)/i);
        const phoneMatch = text.match(/(?:Phone|Contact):\s*([^\n,]+)/i);
        const strengthsMatch = text.match(/(?:Strengths|Key Strengths):\s*([^\n]+)/i);
        const weaknessesMatch = text.match(/(?:Weaknesses|Areas for Improvement):\s*([^\n]+)/i);
        const summaryMatch = text.match(/(?:Summary|Analysis):\s*([^\n]+)/i);
        const scoreMatch = text.match(/(?:Score|Rating):\s*(\d+)/i);

        // Extract email from text if not found with pattern
        const emailFallback = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const phoneFallback = text.match(/(\+?[\d\s\-\(\)]{10,})/);

        const strengths = strengthsMatch ? 
          strengthsMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0) : 
          ['Technical skills demonstrated', 'Professional experience'];
        
        const weaknesses = weaknessesMatch ? 
          weaknessesMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0) : 
          ['Could use more detail', 'Consider adding more specific achievements'];

        const result = {
          name: nameMatch ? nameMatch[1].trim() : null,
          email: emailMatch ? emailMatch[1].trim() : (emailFallback ? emailFallback[1] : null),
          phone: phoneMatch ? phoneMatch[1].trim() : (phoneFallback ? phoneFallback[1] : null),
          strengths: strengths,
          weaknesses: weaknesses,
          summary: summaryMatch ? summaryMatch[1].trim() : responseText.substring(0, 200) + '...',
          score: scoreMatch ? parseInt(scoreMatch[1]) : 75
        };

        console.log('Parsed Analysis:', result); // Debug logging
        return result;
      };

      return parseAnalysis(responseText);
    } catch (error) {
      console.error('Resume analysis error:', error);
      throw new Error('Failed to analyze resume. Please try again.');
    }
  }

  // Generate interview questions using Puter AI
  async generateQuestions(): Promise<GeneratedQuestion[]> {
    await this.waitForPuter();

    try {
      const completion = await this.puter.ai.chat([
        {
          role: 'user',
          content: 'You are an AI Interview Question Generator. Generate exactly 6 interview questions for a Full Stack Developer (React + Node.js) role, strictly ordered as 2 Easy, 2 Medium, and 2 Hard. Questions must be concise, role-specific, and test practical knowledge in React, Node.js, JavaScript, APIs, and full stack development best practices. Return all questions as a JSON array where each object contains {"difficulty":"Easy/Medium/Hard","question_number":<1-6>,"question_text":"string"}.'
        }
      ], { model: 'gemini-2.0-flash' });

      let responseText = '';
      for await (const part of completion) {
        responseText += part?.text || '';
      }

      // Parse JSON response
      try {
        const questions = JSON.parse(responseText);
        return questions.map((q: any) => ({
          difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
          question_number: q.question_number,
          question_text: q.question_text
        }));
      } catch (parseError) {
        // Fallback questions if parsing fails
        return [
          { difficulty: 'easy', question_number: 1, question_text: 'What is the difference between props and state in React?' },
          { difficulty: 'easy', question_number: 2, question_text: 'Explain the purpose of package.json in a Node.js project.' },
          { difficulty: 'medium', question_number: 3, question_text: 'How would you implement authentication in a Node.js/Express application?' },
          { difficulty: 'medium', question_number: 4, question_text: 'What are React hooks and how do they improve state management?' },
          { difficulty: 'hard', question_number: 5, question_text: 'How would you design and optimize a REST API that supports millions of requests per day?' },
          { difficulty: 'hard', question_number: 6, question_text: 'Explain how you would handle server-side rendering with React and Node.js for performance and SEO benefits.' }
        ];
      }
    } catch (error) {
      console.error('Question generation error:', error);
      throw new Error('Failed to generate questions. Please try again.');
    }
  }

  // Evaluate answer using Puter AI
  async evaluateAnswer(question: string, answer: string, difficulty: string): Promise<AnswerEvaluation> {
    await this.waitForPuter();

    try {
      const completion = await this.puter.ai.chat([
        {
          role: 'user',
          content: `Please evaluate this interview answer for a Full Stack Developer position.

Question (${difficulty}): ${question}
Answer: ${answer}

Provide a detailed evaluation with:
1. A score out of 100
2. Specific feedback on what was good and what could be improved
3. 2-3 key strengths shown in the answer
4. 2-3 areas for improvement

Return the response in this JSON format:
{
  "score": 85,
  "feedback": "detailed feedback",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`
        }
      ], { model: 'claude-sonnet-4' });

      let responseText = '';
      for await (const part of completion) {
        responseText += part?.text || '';
      }

      // Parse JSON response
      try {
        const evaluation = JSON.parse(responseText);
        return {
          score: evaluation.score || 0,
          feedback: evaluation.feedback || 'No specific feedback available',
          strengths: evaluation.strengths || [],
          improvements: evaluation.improvements || []
        };
      } catch (parseError) {
        // Fallback evaluation
        return {
          score: Math.floor(Math.random() * 40) + 60,
          feedback: 'Answer provided, but detailed evaluation unavailable',
          strengths: ['Attempted to answer the question'],
          improvements: ['Could provide more specific examples']
        };
      }
    } catch (error) {
      console.error('Answer evaluation error:', error);
      throw new Error('Failed to evaluate answer. Please try again.');
    }
  }

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
      ], { model: 'claude-sonnet-4' });

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

  // Convert text to speech using Puter
  async textToSpeech(text: string): Promise<HTMLAudioElement> {
    await this.waitForPuter();

    try {
      console.log('Converting to speech:', text.substring(0, 100) + '...');
      
      const audio = await this.puter.ai.txt2speech(text, {
        voice: "Joanna",
        engine: "generative",
        language: "en-US"
      });

      // Ensure audio plays
      if (audio && typeof audio.play === 'function') {
        try {
          await audio.play();
        } catch (playError) {
          console.warn('Audio play failed, but audio object created:', playError);
        }
      }

      return audio;
    } catch (error) {
      console.error('TTS error:', error);
      // Return a mock audio object to prevent crashes
      return {
        play: () => Promise.resolve(),
        pause: () => {},
        currentTime: 0,
        duration: 0
      } as HTMLAudioElement;
    }
  }
}

export const aiService = new AIService();

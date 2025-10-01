// AI Service - Main orchestrator for all AI functionality
import { 
  ResumeAnalyzer, 
  QuestionGenerator, 
  AnswerEvaluator, 
  TTSService, 
  InterviewSummary,
  type ResumeAnalysis,
  type GeneratedQuestion,
  type AnswerEvaluation
} from './ai';

class AIService {
  private resumeAnalyzer: ResumeAnalyzer;
  private questionGenerator: QuestionGenerator;
  private answerEvaluator: AnswerEvaluator;
  private ttsService: TTSService;
  private interviewSummary: InterviewSummary;

  constructor() {
    this.resumeAnalyzer = new ResumeAnalyzer();
    this.questionGenerator = new QuestionGenerator();
    this.answerEvaluator = new AnswerEvaluator();
    this.ttsService = new TTSService();
    this.interviewSummary = new InterviewSummary();
  }

  // Check if Puter is loaded
  isReady(): boolean {
    return this.resumeAnalyzer.isReady();
  }

  // Wait for Puter to be available
  async waitForPuter(): Promise<void> {
    await this.resumeAnalyzer.waitForPuter();
  }

  // Analyze resume using specialized service
  async analyzeResume(file: File): Promise<ResumeAnalysis> {
    return this.resumeAnalyzer.analyzeResume(file);
  }

  // Generate interview questions using specialized service
  async generateQuestions(): Promise<GeneratedQuestion[]> {
    return this.questionGenerator.generateQuestions();
  }

  // Generate interview questions based on cached resume analysis
  async generateQuestionsFromResume(resumeAnalysis: any): Promise<GeneratedQuestion[]> {
    const tempResumePath = this.resumeAnalyzer.getTempResumePath();
    return this.questionGenerator.generateQuestionsFromResume(resumeAnalysis, tempResumePath);
  }

  // Evaluate answer using specialized service
  async evaluateAnswer(question: string, answer: string, difficulty: string): Promise<AnswerEvaluation> {
    return this.answerEvaluator.evaluateAnswer(question, answer, difficulty);
  }

  // Generate final interview summary using specialized service
  async generateFinalSummary(candidate: any, questions: any[], answers: any[]): Promise<string> {
    return this.interviewSummary.generateFinalSummary(candidate, questions, answers);
  }

  // Convert text to speech using specialized service
  async textToSpeech(text: string): Promise<HTMLAudioElement> {
    return this.ttsService.textToSpeech(text);
  }
}

export const aiService = new AIService();

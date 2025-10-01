import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Question {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  answer?: string;
  score?: number;
  timeSpent?: number;
  aiAnswer?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeText?: string;
  resumeFileName?: string;
  resumeScore?: number;
  resumeStrengths?: string[];
  resumeWeaknesses?: string[];
}

export interface ResumeAnalysis {
  name: string | null;
  email: string | null;
  phone: string | null;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  score: number;
}

export interface InterviewState {
  currentCandidate: Candidate | null;
  questions: Question[];
  currentQuestionIndex: number;
  isInterviewActive: boolean;
  isQuestionActive: boolean;
  timeRemaining: number;
  chatHistory: Array<{
    id: string;
    type: 'user' | 'ai' | 'system';
    content: string;
    timestamp: number;
  }>;
  finalScore?: number;
  finalSummary?: string;
  missingFields: string[];
  stage: 'upload' | 'collecting-info' | 'interview' | 'completed';
  resumeAnalysis: ResumeAnalysis | null;
  isResumeAnalysisComplete: boolean;
}

const initialState: InterviewState = {
  currentCandidate: null,
  questions: [],
  currentQuestionIndex: 0,
  isInterviewActive: false,
  isQuestionActive: false,
  timeRemaining: 0,
  chatHistory: [],
  missingFields: [],
  stage: 'upload',
  resumeAnalysis: null,
  isResumeAnalysisComplete: false,
};

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    setCandidate: (state, action: PayloadAction<Partial<Candidate>>) => {
      if (state.currentCandidate) {
        state.currentCandidate = { ...state.currentCandidate, ...action.payload };
      } else {
        state.currentCandidate = action.payload as Candidate;
      }
    },
    setMissingFields: (state, action: PayloadAction<string[]>) => {
      state.missingFields = action.payload;
    },
    setStage: (state, action: PayloadAction<InterviewState['stage']>) => {
      state.stage = action.payload;
    },
    addChatMessage: (state, action: PayloadAction<{
      type: 'user' | 'ai' | 'system';
      content: string;
    }>) => {
      state.chatHistory.push({
        id: Date.now().toString(),
        ...action.payload,
        timestamp: Date.now(),
      });
    },
    setQuestions: (state, action: PayloadAction<Question[]>) => {
      state.questions = action.payload;
    },
    setResumeAnalysis: (state, action: PayloadAction<ResumeAnalysis>) => {
      state.resumeAnalysis = action.payload;
      state.isResumeAnalysisComplete = true;
    },
    setResumeAnalysisComplete: (state, action: PayloadAction<boolean>) => {
      state.isResumeAnalysisComplete = action.payload;
    },
    startInterview: (state) => {
      state.isInterviewActive = true;
      state.stage = 'interview';
      state.currentQuestionIndex = 0;
    },
    startQuestion: (state) => {
      const currentQuestion = state.questions[state.currentQuestionIndex];
      if (currentQuestion) {
        state.isQuestionActive = true;
        state.timeRemaining = currentQuestion.timeLimit;
      }
    },
    tickTimer: (state) => {
      if (state.timeRemaining > 0) {
        state.timeRemaining -= 1;
      }
    },
    submitAnswer: (state, action: PayloadAction<{ answer: string; timeSpent: number }>) => {
      const currentQuestion = state.questions[state.currentQuestionIndex];
      if (currentQuestion) {
        currentQuestion.answer = action.payload.answer;
        currentQuestion.timeSpent = action.payload.timeSpent;
      }
      state.isQuestionActive = false;
    },
    setQuestionScore: (state, action: PayloadAction<{ questionIndex: number; score: number }>) => {
      const question = state.questions[action.payload.questionIndex];
      if (question) {
        question.score = action.payload.score;
      }
    },
    setQuestionAIAnswer: (state, action: PayloadAction<{ questionIndex: number; aiAnswer: string }>) => {
      const question = state.questions[action.payload.questionIndex];
      if (question) {
        question.aiAnswer = action.payload.aiAnswer;
      }
    },
    nextQuestion: (state) => {
      state.currentQuestionIndex += 1;
      if (state.currentQuestionIndex >= state.questions.length) {
        state.isInterviewActive = false;
        state.stage = 'completed';
      }
    },
    setFinalResults: (state, action: PayloadAction<{ score: number; summary: string }>) => {
      state.finalScore = action.payload.score;
      state.finalSummary = action.payload.summary;
      // Mirror the AI final summary into current candidate for consistent persistence
      if (state.currentCandidate) {
        state.currentCandidate.resumeText = action.payload.summary;
      }
    },
    resetInterview: () => initialState,
  },
});

export const {
  setCandidate,
  setMissingFields,
  setStage,
  addChatMessage,
  setQuestions,
  setResumeAnalysis,
  setResumeAnalysisComplete,
  startInterview,
  startQuestion,
  tickTimer,
  submitAnswer,
  setQuestionScore,
  setQuestionAIAnswer,
  nextQuestion,
  setFinalResults,
  resetInterview,
} = interviewSlice.actions;

export default interviewSlice.reducer;
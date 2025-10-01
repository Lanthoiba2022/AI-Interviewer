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
  // Enhanced persistence tracking
  interviewId: string | null;
  startedAt: number | null;
  lastActivityAt: number | null;
  status: 'draft' | 'in-progress' | 'paused' | 'completed';
  progress: {
    resumeUploaded: boolean;
    infoCollected: boolean;
    questionsGenerated: boolean;
    interviewStarted: boolean;
  };
}

const defaultProgress: InterviewState['progress'] = {
  resumeUploaded: false,
  infoCollected: false,
  questionsGenerated: false,
  interviewStarted: false,
};

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
  // Enhanced persistence tracking
  interviewId: null,
  startedAt: null,
  lastActivityAt: null,
  status: 'draft',
  progress: {
    resumeUploaded: false,
    infoCollected: false,
    questionsGenerated: false,
    interviewStarted: false,
  },
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
      // Update info collected progress when essential fields are present
      if (!state.progress) {
        state.progress = { ...defaultProgress };
      }
      const hasAllInfo = Boolean(
        state.currentCandidate?.name &&
        state.currentCandidate?.email &&
        state.currentCandidate?.phone
      );
      state.progress.infoCollected = hasAllInfo;
      state.lastActivityAt = Date.now();
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
      state.lastActivityAt = Date.now();
    },
    setQuestions: (state, action: PayloadAction<Question[]>) => {
      state.questions = action.payload;
      if (!state.progress) {
        state.progress = { ...defaultProgress };
      }
      state.progress.questionsGenerated = action.payload.length > 0;
      state.lastActivityAt = Date.now();
    },
    setResumeAnalysis: (state, action: PayloadAction<ResumeAnalysis>) => {
      state.resumeAnalysis = action.payload;
      state.isResumeAnalysisComplete = true;
      if (!state.progress) {
        state.progress = { ...defaultProgress };
      }
      state.progress.resumeUploaded = true;
      state.lastActivityAt = Date.now();
    },
    setResumeAnalysisComplete: (state, action: PayloadAction<boolean>) => {
      state.isResumeAnalysisComplete = action.payload;
    },
    startInterview: (state) => {
      state.isInterviewActive = true;
      state.stage = 'interview';
      state.currentQuestionIndex = 0;
      state.status = 'in-progress';
      if (!state.progress) {
        state.progress = { ...defaultProgress };
      }
      state.progress.interviewStarted = true;
      state.lastActivityAt = Date.now();
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
      state.status = 'completed';
      state.lastActivityAt = Date.now();
      // Mirror the AI final summary into current candidate for consistent persistence
      if (state.currentCandidate) {
        state.currentCandidate.resumeText = action.payload.summary;
      }
    },
    // Enhanced persistence actions
    initializeInterview: (state) => {
      state.interviewId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      state.startedAt = Date.now();
      state.lastActivityAt = Date.now();
      state.status = 'draft';
    },
    loadFromInProgress: (state, action: PayloadAction<{
      interviewId: string;
      currentCandidate: Candidate;
      questions: Question[];
      currentQuestionIndex: number;
      status: InterviewState['status'];
      startedAt: number;
      lastActivityAt: number;
      progress: InterviewState['progress'];
      chatHistory: InterviewState['chatHistory'];
      stage: InterviewState['stage'];
      resumeAnalysis?: ResumeAnalysis | null;
      isResumeAnalysisComplete?: boolean;
    }>) => {
      state.interviewId = action.payload.interviewId;
      state.currentCandidate = action.payload.currentCandidate;
      state.questions = action.payload.questions;
      state.currentQuestionIndex = action.payload.currentQuestionIndex;
      state.status = action.payload.status;
      state.startedAt = action.payload.startedAt;
      state.lastActivityAt = action.payload.lastActivityAt;
      state.progress = action.payload.progress;
      state.chatHistory = action.payload.chatHistory;
      state.stage = action.payload.stage;
      state.isInterviewActive = action.payload.status === 'in-progress';
      if (typeof action.payload.isResumeAnalysisComplete !== 'undefined') {
        state.isResumeAnalysisComplete = !!action.payload.isResumeAnalysisComplete;
      }
      if (typeof action.payload.resumeAnalysis !== 'undefined') {
        state.resumeAnalysis = action.payload.resumeAnalysis || null;
      }
    },
    updateProgress: (state, action: PayloadAction<Partial<InterviewState['progress']>>) => {
      if (!state.progress) {
        state.progress = { ...defaultProgress };
      }
      state.progress = { ...state.progress, ...action.payload };
      state.lastActivityAt = Date.now();
    },
    pauseInterview: (state) => {
      state.isInterviewActive = false;
      state.status = 'paused';
      // Ensure question timer is not running while paused
      state.isQuestionActive = false;
      state.lastActivityAt = Date.now();
    },
    resumeInterview: (state) => {
      state.isInterviewActive = true;
      state.status = 'in-progress';
      // On resume, do not auto-run the current question timer; let TTS play first
      state.isQuestionActive = false;
      state.timeRemaining = 0;
      state.lastActivityAt = Date.now();
    },
    setInterviewStatus: (state, action: PayloadAction<InterviewState['status']>) => {
      state.status = action.payload;
      state.lastActivityAt = Date.now();
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
  // Enhanced persistence actions
  initializeInterview,
  updateProgress,
  pauseInterview,
  resumeInterview,
  setInterviewStatus,
  loadFromInProgress,
  resetInterview,
} = interviewSlice.actions;

export default interviewSlice.reducer;
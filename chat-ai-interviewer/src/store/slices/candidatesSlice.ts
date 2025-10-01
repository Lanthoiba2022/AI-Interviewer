import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Question, Candidate, ResumeAnalysis } from './interviewSlice';

export interface CompletedCandidate extends Candidate {
  questions: Question[];
  finalScore: number;
  finalSummary: string;
  completedAt: number;
  chatHistory: Array<{
    id: string;
    type: 'user' | 'ai' | 'system';
    content: string;
    timestamp: number;
  }>;
}

export interface InProgressCandidate extends Candidate {
  interviewId: string;
  questions: Question[];
  currentQuestionIndex: number;
  status: 'draft' | 'in-progress' | 'paused';
  startedAt: number;
  lastActivityAt: number;
  progress: {
    resumeUploaded: boolean;
    infoCollected: boolean;
    questionsGenerated: boolean;
    interviewStarted: boolean;
  };
  chatHistory: Array<{
    id: string;
    type: 'user' | 'ai' | 'system';
    content: string;
    timestamp: number;
  }>;
  stage: 'upload' | 'collecting-info' | 'interview';
  resumeAnalysis?: ResumeAnalysis | null;
  isResumeAnalysisComplete?: boolean;
}

interface CandidatesState {
  completed: CompletedCandidate[];
  inProgress: InProgressCandidate[];
  searchTerm: string;
  sortBy: 'score' | 'name' | 'completedAt' | 'lastActivityAt';
  sortOrder: 'asc' | 'desc';
}

const initialState: CandidatesState = {
  completed: [],
  inProgress: [],
  searchTerm: '',
  sortBy: 'score',
  sortOrder: 'desc',
};

const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    addCompletedCandidate: (state, action: PayloadAction<CompletedCandidate>) => {
      if (!state.completed) state.completed = [];
      state.completed.push(action.payload);
    },
    // In-progress interview management
    saveInProgressInterview: (state, action: PayloadAction<InProgressCandidate>) => {
      if (!state.inProgress) state.inProgress = [];
      const existingIndex = state.inProgress.findIndex(
        candidate => candidate.interviewId === action.payload.interviewId
      );
      
      if (existingIndex >= 0) {
        // Update existing in-progress interview
        state.inProgress[existingIndex] = action.payload;
      } else {
        // Add new in-progress interview
        state.inProgress.push(action.payload);
      }
    },
    removeInProgressInterview: (state, action: PayloadAction<string>) => {
      if (!state.inProgress) state.inProgress = [];
      state.inProgress = state.inProgress.filter(
        candidate => candidate.interviewId !== action.payload
      );
    },
    moveToCompleted: (state, action: PayloadAction<{ interviewId: string; completedCandidate: CompletedCandidate }>) => {
      // Remove from in-progress and add to completed
      if (!state.inProgress) state.inProgress = [];
      state.inProgress = state.inProgress.filter(
        candidate => candidate.interviewId !== action.payload.interviewId
      );
      if (!state.completed) state.completed = [];
      state.completed.push(action.payload.completedCandidate);
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setSortBy: (state, action: PayloadAction<CandidatesState['sortBy']>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<CandidatesState['sortOrder']>) => {
      state.sortOrder = action.payload;
    },
  },
});

export const {
  addCompletedCandidate,
  // In-progress interview management
  saveInProgressInterview,
  removeInProgressInterview,
  moveToCompleted,
  setSearchTerm,
  setSortBy,
  setSortOrder,
} = candidatesSlice.actions;

export default candidatesSlice.reducer;
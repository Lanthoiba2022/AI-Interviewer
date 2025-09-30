import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Question, Candidate } from './interviewSlice';

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

interface CandidatesState {
  completed: CompletedCandidate[];
  searchTerm: string;
  sortBy: 'score' | 'name' | 'completedAt';
  sortOrder: 'asc' | 'desc';
}

const initialState: CandidatesState = {
  completed: [],
  searchTerm: '',
  sortBy: 'score',
  sortOrder: 'desc',
};

const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    addCompletedCandidate: (state, action: PayloadAction<CompletedCandidate>) => {
      state.completed.push(action.payload);
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
  setSearchTerm,
  setSortBy,
  setSortOrder,
} = candidatesSlice.actions;

export default candidatesSlice.reducer;
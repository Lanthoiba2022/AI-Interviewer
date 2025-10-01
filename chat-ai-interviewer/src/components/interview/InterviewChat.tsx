import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { 
  setQuestions, 
  startInterview,
  addChatMessage
} from '@/store/slices/interviewSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { aiService } from '@/services/aiService';
import InterviewQuestion from './InterviewQuestion';
import InterviewComplete from './InterviewComplete';
import type { Question } from '@/store/slices/interviewSlice';

const InterviewChat = () => {
  const dispatch = useDispatch();
  const { 
    questions, 
    currentQuestionIndex, 
    currentCandidate,
    isInterviewActive,
    stage,
    resumeAnalysis
  } = useSelector((state: RootState) => state.interview);

  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Generate questions using AI when interview starts
  useEffect(() => {
    console.log('InterviewChat useEffect - questions:', questions.length, 'candidate:', !!currentCandidate, 'isInterviewActive:', isInterviewActive);
    if (questions.length === 0 && currentCandidate && isInterviewActive) {
      console.log('Generating questions because interview is active but no questions exist');
      generateQuestions();
    }
  }, [dispatch, questions.length, currentCandidate, isInterviewActive]);

  // Ensure interview is started when component mounts
  useEffect(() => {
    if (currentCandidate && !isInterviewActive) {
      console.log('Starting interview from InterviewChat component');
      dispatch(startInterview());
    }
  }, [currentCandidate, isInterviewActive, dispatch]);

  const generateQuestions = async () => {
    console.log('Generating questions...');
    setIsGeneratingQuestions(true);
    try {
      await aiService.waitForPuter();
      console.log('Puter is ready, generating questions...');
      
      // Use cached resume analysis if available; fall back to generic if not permitted
      let generatedQuestions: any[];
      if (resumeAnalysis) {
        console.log('Using cached resume analysis for question generation');
        try {
          generatedQuestions = await aiService.generateQuestionsFromResume(resumeAnalysis);
        } catch (e: any) {
          console.warn('Personalized generation failed, falling back to generic questions:', e);
          dispatch(addChatMessage({
            type: 'system',
            content: 'Personalized question generation is unavailable for your current token. Falling back to general questions.'
          }));
          generatedQuestions = await aiService.generateQuestions();
        }
      } else {
        console.log('No cached resume analysis, generating generic questions');
        generatedQuestions = await aiService.generateQuestions();
      }
      
      console.log('Generated questions:', generatedQuestions);
      
      const formattedQuestions: Question[] = generatedQuestions
        .filter((q: any) => !!q && (q.question_text || q.text))
        .map((q: any, index: number) => {
          const difficulty = ((q.difficulty || 'Easy')).toLowerCase() as 'easy' | 'medium' | 'hard';
          return {
            id: (index + 1).toString(),
            text: (q.question_text || q.text) as string,
            difficulty,
            timeLimit: difficulty === 'easy' ? 20 : difficulty === 'medium' ? 60 : 120,
          };
        });

      console.log('Formatted questions:', formattedQuestions);
      dispatch(setQuestions(formattedQuestions));
    } catch (error) {
      console.error('Failed to generate questions:', error);
      // As a last resort, attempt generic generation once
      try {
        const generic = await aiService.generateQuestions();
        const formatted: Question[] = generic.map((q: any, index: number) => {
          const difficulty = ((q.difficulty || 'Easy')).toLowerCase() as 'easy' | 'medium' | 'hard';
          return {
            id: (index + 1).toString(),
            text: (q.question_text || q.text) as string,
            difficulty,
            timeLimit: difficulty === 'easy' ? 20 : difficulty === 'medium' ? 60 : 120,
          };
        });
        dispatch(setQuestions(formatted));
      } catch {}
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Show loading state while generating questions
  if (isGeneratingQuestions && questions.length === 0) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Preparing Your Interview</h2>
        <p className="text-muted-foreground">
          {currentCandidate?.name} • Full Stack Developer Position
        </p>
          
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg">Generating personalized questions...</span>
            </div>
          
          <div className="max-w-md mx-auto">
            <Progress value={33} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Analyzing your resume and creating tailored questions
            </p>
            </div>
        </div>
      </div>
    );
  }

  // Show interview complete if stage is completed
  if (stage === 'completed') {
    return <InterviewComplete />;
  }

  // Show individual question interface
  if (questions.length > 0) {
    return <InterviewQuestion />;
  }

  // Fallback loading state
  return (
    <div className="max-w-4xl mx-auto text-center py-12">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Preparing interview...</p>
    </div>
  );
};

export default InterviewChat;
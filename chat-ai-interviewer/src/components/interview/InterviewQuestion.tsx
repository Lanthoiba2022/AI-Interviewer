import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { 
  startQuestion, 
  tickTimer, 
  submitAnswer, 
  nextQuestion,
  addChatMessage,
  setQuestionScore,
  setQuestionAIAnswer,
  setFinalResults,
  resetInterview,
  pauseInterview,
  setStage
} from '@/store/slices/interviewSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Send, SkipForward, Mic, MicOff, Volume2, Loader2, CheckCircle, X } from 'lucide-react';
import type { Question } from '@/store/slices/interviewSlice';
import { aiService } from '@/services/aiService';
import { store } from '@/store/store';
import { removeInProgressInterview, moveToCompleted } from '@/store/slices/candidatesSlice';
import { useSpeechToText } from '@/services/speechService';

const InterviewQuestion = () => {
  const dispatch = useDispatch();
  const { 
    questions, 
    currentQuestionIndex, 
    isQuestionActive, 
    timeRemaining, 
    currentCandidate,
    interviewId,
    chatHistory
  } = useSelector((state: RootState) => state.interview);

  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasReadQuestion, setHasReadQuestion] = useState(false);
  const [allowTTS, setAllowTTS] = useState(true);

  // Speech-to-text hook
  const { 
    isRecording, 
    transcript, 
    isListening, 
    hasValidApiKey,
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechToText();

  const currentQuestion = questions[currentQuestionIndex];
  const progress = (() => {
    const answeredCount = questions.filter(q => (q.answer || '').trim().length > 0).length;
    const total = Math.max(questions.length, 1);
    return (answeredCount / total) * 100;
  })();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isQuestionActive && timeRemaining > 0) {
      interval = setInterval(() => {
        dispatch(tickTimer());
      }, 1000);
    } else if (isQuestionActive && timeRemaining === 0) {
      // Time's up - auto behavior
      handleTimeUp();
    }

    return () => clearInterval(interval);
  }, [isQuestionActive, timeRemaining, dispatch, answer]);

  // Start question when component mounts or when continuing
  useEffect(() => {
    // Always try to use TTS first when continuing; timer will only start after TTS ends
    // If TTS has been explicitly disabled (e.g., after Exit), start immediately without TTS
    if (currentQuestion && !isQuestionActive && !hasReadQuestion) {
      if (allowTTS) {
        startCurrentQuestion();
      } else {
        setIsPlayingAudio(false);
        setHasReadQuestion(true);
        dispatch(startQuestion());
        setStartTime(Date.now());
        setAllowTTS(true);
        setAnswer('');
        resetTranscript();
      }
    }
  }, [currentQuestion, isQuestionActive, hasReadQuestion, allowTTS, dispatch, resetTranscript]);

  // Update answer when transcript changes
  useEffect(() => {
    if (transcript) {
      setAnswer(transcript);
    }
  }, [transcript]);

  const startCurrentQuestion = async () => {
    if (!currentQuestion) return;

    console.log('Starting question:', currentQuestionIndex + 1, currentQuestion);

    // Record the question text in chat history so it appears consistently everywhere
    dispatch(addChatMessage({
      type: 'ai',
      content: currentQuestion.text,
    }));

    // Play only the question text (without question number)
    try {
      setIsPlayingAudio(true);
      const audio = await aiService.textToSpeech(currentQuestion.text);
      
      // Check if TTS failed (returned null)
      if (!audio) {
        console.log('TTS failed, waiting 5 seconds then starting timer');
        // Wait 5 seconds for TTS failure, then start timer
        setTimeout(() => {
          setIsPlayingAudio(false);
          setHasReadQuestion(true);
          
          dispatch(startQuestion());
          setStartTime(Date.now());
          setAnswer('');
          resetTranscript();
        }, 5000);
        return;
      }
      
      // TTS succeeded - wait for audio to finish playing before starting timer
      // Set a timeout to prevent infinite waiting if audio never ends
      const timeoutId = setTimeout(() => {
        console.log('TTS timeout - starting timer anyway');
        setIsPlayingAudio(false);
        setHasReadQuestion(true);
        
        dispatch(startQuestion());
        setStartTime(Date.now());
        setAnswer('');
        resetTranscript();
      }, 30000); // 30 second timeout
      
      audio.addEventListener('ended', () => {
        console.log('TTS audio finished, starting timer');
        clearTimeout(timeoutId);
        setIsPlayingAudio(false);
        setHasReadQuestion(true);
        
        // Start the question and timer after TTS finishes
        dispatch(startQuestion());
        setStartTime(Date.now());
        setAnswer('');
        resetTranscript();
      });
      
      // If audio is already ended (very short text), start immediately
      if (audio.ended) {
        console.log('TTS audio already finished, starting timer immediately');
        clearTimeout(timeoutId);
        setIsPlayingAudio(false);
        setHasReadQuestion(true);
        
        dispatch(startQuestion());
        setStartTime(Date.now());
        setAnswer('');
        resetTranscript();
      }
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback on error - wait 5 seconds then start timer
      console.log('TTS failed, waiting 5 seconds then starting timer');
      setTimeout(() => {
        setIsPlayingAudio(false);
        setHasReadQuestion(true);
        
        dispatch(startQuestion());
        setStartTime(Date.now());
        setAnswer('');
        resetTranscript();
      }, 5000);
    }
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!currentQuestion) return;

    const timeSpent = currentQuestion.timeLimit - timeRemaining;
    const submittedAnswer = isAutoSubmit ? (answer || 'No answer provided (time expired)') : answer;

    // Add user message to chat history
    dispatch(addChatMessage({
      type: 'user',
      content: submittedAnswer,
    }));

    // Submit answer
    dispatch(submitAnswer({ 
      answer: submittedAnswer, 
      timeSpent 
    }));

    // Stop voice recording if active
    if (isRecording) {
      stopListening();
    }

    // If this was the last question, immediately show evaluating state
    if (currentQuestionIndex >= questions.length - 1) {
      setIsEvaluating(true);
    } else {
      // DO NOT evaluate per-question; evaluation deferred to end of interview
      setIsEvaluating(false);
    }

    // Move to next question or finish
    setTimeout(async () => {
      if (currentQuestionIndex < questions.length - 1) {
        // After submit/skip, do not replay TTS for current question; enable TTS for the next question
        setAllowTTS(true);
        dispatch(nextQuestion());
        // Reset for next question
        setHasReadQuestion(false);
        setAnswer('');
        resetTranscript();
      } else {
        // Interview complete - evaluate all answers, then generate final summary
        try {
          // Evaluating loader already enabled above for last question

          // Show evaluating state while we process final results for the whole interview
          setIsEvaluating(true);
          // Evaluate all questions sequentially to gather per-question scores and feedback
          const evaluations: Array<{ score: number; feedback: string; aiAnswer: string }> = [];
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            try {
              // Rule-based penalty for blank / "I don't know" style answers before AI call
              const rawAns = (q.answer || '').trim().toLowerCase();
              const isNoAnswer = rawAns.length === 0;
              const isIDK = /^(i don['’]t know|dont know|no idea|not sure|skip | pass | no comment)$/i.test(rawAns) ||
                rawAns.includes("don't know") || rawAns.includes('dont know') || rawAns.includes('no idea');

              if (isNoAnswer || isIDK) {
                const penaltyScore = 5; // hard cap for no/IDK answers
                let aiAnswerText = '';
                try {
                  // Still fetch a concise correct answer for learning
                  const evalForAnswer = await aiService.evaluateAnswer(q.text, q.answer || '', q.difficulty);
                  aiAnswerText = evalForAnswer.conciseAnswer || '';
                  if (aiAnswerText) {
                    dispatch(setQuestionAIAnswer({ questionIndex: i, aiAnswer: aiAnswerText }));
                  }
                } catch {}
                evaluations.push({ score: penaltyScore, feedback: isNoAnswer ? 'No answer provided.' : 'Candidate indicated they do not know the answer.', aiAnswer: aiAnswerText });
                dispatch(setQuestionScore({ questionIndex: i, score: penaltyScore }));
                continue;
              }

              const evalResult = await aiService.evaluateAnswer(q.text, q.answer || '', q.difficulty);
              const conciseAIAnswer = evalResult.conciseAnswer || '';
              evaluations.push({ score: evalResult.score, feedback: evalResult.feedback, aiAnswer: conciseAIAnswer });
              dispatch(setQuestionScore({ questionIndex: i, score: evalResult.score }));
              if (conciseAIAnswer) {
                dispatch(setQuestionAIAnswer({ questionIndex: i, aiAnswer: conciseAIAnswer }));
              }
            } catch (e) {
              // Conservative fallback
              const fallback = 0;
              evaluations.push({ score: fallback, feedback: 'Evaluation unavailable.', aiAnswer: '' });
              dispatch(setQuestionScore({ questionIndex: i, score: fallback }));
            }
          }

          // Post a compact per-question summary to chat
          const summaryLines = evaluations.map((e, idx) => `Q${idx + 1}: ${e.score}%`).join(' | ');
          dispatch(addChatMessage({ type: 'ai', content: `Per-question scores: ${summaryLines}` }));

          // Post compact AI answers in chat for learning (not too deep)
          const aiAnswersCompact = evaluations
            .map((e, idx) => e.aiAnswer ? `Q${idx + 1}: ${e.aiAnswer}` : null)
            .filter(Boolean)
            .join('\n');
          if (aiAnswersCompact) {
            dispatch(addChatMessage({ type: 'ai', content: `AI Answers (concise):\n${aiAnswersCompact}` }));
          }

          const finalSummaryRaw = await aiService.generateFinalSummary(
            currentCandidate,
            questions,
            questions.map((q, i) => ({ answer: q.answer, score: evaluations[i]?.score || q.score || 0 }))
          );
          const finalSummary = (finalSummaryRaw || '')
            .replace(/[\*#`]+/g, '')
            .replace(/^\s*[-]+\s*/gm, '')
            .trim();

          // Weighted final score: 80% interview average, 20% resume score
          const interviewAverage = Math.round(
            evaluations.reduce((sum, e) => sum + e.score, 0) / Math.max(1, questions.length)
          );
          const RESUME_WEIGHT = 0.2;
          const resumeScore = Math.max(0, Math.min(100, currentCandidate?.resumeScore || 0));
          const weightedFinal = Math.round(interviewAverage * (1 - RESUME_WEIGHT) + resumeScore * RESUME_WEIGHT);

          dispatch(setFinalResults({ score: weightedFinal, summary: finalSummary }));

          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${weightedFinal}%. ${finalSummary}`,
          }));

          // Mark the interview as completed to prevent re-asking
          dispatch(setStage('completed'));
          if (interviewId && currentCandidate) {
            const latestState = store.getState();
            const latestChat = latestState.interview.chatHistory;
            const questionsWithAI = questions.map((q, i) => ({
              ...q,
              score: evaluations[i]?.score ?? q.score ?? 0,
              aiAnswer: evaluations[i]?.aiAnswer ?? q.aiAnswer,
            }));
            dispatch(moveToCompleted({
              interviewId,
              completedCandidate: {
                ...currentCandidate,
                questions: questionsWithAI,
                finalScore: weightedFinal,
                finalSummary: finalSummary,
                completedAt: Date.now(),
                chatHistory: latestChat,
              }
            }));
            dispatch(removeInProgressInterview(interviewId));
          }
          setIsEvaluating(false);
        } catch (error) {
          console.error('Final summary error:', error);
          const interviewAverageOnError = Math.round(
            questions.reduce((sum, q) => sum + (q.score || 0), 0) / Math.max(1, questions.length)
          );
          const RESUME_WEIGHT_ERR = 0.2;
          const resumeScoreErr = Math.max(0, Math.min(100, currentCandidate?.resumeScore || 0));
          const weightedFinalErr = Math.round(interviewAverageOnError * (1 - RESUME_WEIGHT_ERR) + resumeScoreErr * RESUME_WEIGHT_ERR);
          const summary = `Completed ${questions.length} questions with an average score of ${weightedFinalErr}%.`;

          const summarySanitized = summary.replace(/[\*#`]+/g, '').replace(/^\s*[-]+\s*/gm, '').trim();
          dispatch(setFinalResults({ score: weightedFinalErr, summary: summarySanitized }));

          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${weightedFinalErr}%. ${summary}`,
          }));

          // Ensure stage is set to completed even on error
          dispatch(setStage('completed'));
          if (interviewId && currentCandidate) {
            const latestState = store.getState();
            const latestChat = latestState.interview.chatHistory;
            const questionsWithExisting = questions.map((q) => ({ ...q }));
            dispatch(moveToCompleted({
              interviewId,
              completedCandidate: {
                ...currentCandidate,
                questions: questionsWithExisting,
                finalScore: weightedFinalErr,
                finalSummary: summarySanitized,
                completedAt: Date.now(),
                chatHistory: latestChat,
              }
            }));
            dispatch(removeInProgressInterview(interviewId));
          }
          setIsEvaluating(false);
        }
      }
    }, 2000);
  };

  // Handle timer expiry: auto-submit only if there is content, otherwise skip without posting placeholder
  const handleTimeUp = async () => {
    if (!currentQuestion) return;
    const hasContent = !!answer.trim();
    if (hasContent) {
      await handleSubmit(true);
      return;
    }

    const timeSpent = currentQuestion.timeLimit - timeRemaining;

    // Submit empty answer quietly (no chat bubble)
    dispatch(submitAnswer({ 
      answer: '', 
      timeSpent 
    }));

    if (isRecording) {
      stopListening();
    }

    // Proceed to next or finish evaluation
    setTimeout(async () => {
      if (currentQuestionIndex < questions.length - 1) {
        // For auto-advance due to timeout, we allow TTS since user didn't actively submit
        setAllowTTS(true);
        dispatch(nextQuestion());
        setHasReadQuestion(false);
        setAnswer('');
        resetTranscript();
      } else {
        try {
          setIsEvaluating(true);
          const evaluations: Array<{ score: number; feedback: string; aiAnswer: string }> = [];
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            try {
              const rawAns = (q.answer || '').trim().toLowerCase();
              const isNoAnswer = rawAns.length === 0;
              const isIDK = /^(i don['’]t know|dont know|no idea|not sure|skip| pass | no comment)$/i.test(rawAns) ||
                rawAns.includes("don't know") || rawAns.includes('dont know') || rawAns.includes('no idea');

              if (isNoAnswer || isIDK) {
                const penaltyScore = 5;
                let aiAnswerText = '';
                try {
                  const evalForAnswer = await aiService.evaluateAnswer(q.text, q.answer || '', q.difficulty);
                  aiAnswerText = evalForAnswer.conciseAnswer || '';
                  if (aiAnswerText) {
                    dispatch(setQuestionAIAnswer({ questionIndex: i, aiAnswer: aiAnswerText }));
                  }
                } catch {}
                evaluations.push({ score: penaltyScore, feedback: isNoAnswer ? 'No answer provided.' : 'Candidate indicated they do not know the answer.', aiAnswer: aiAnswerText });
                dispatch(setQuestionScore({ questionIndex: i, score: penaltyScore }));
                continue;
              }

              const evalResult = await aiService.evaluateAnswer(q.text, q.answer || '', q.difficulty);
              const conciseAIAnswer = evalResult.conciseAnswer || '';
              evaluations.push({ score: evalResult.score, feedback: evalResult.feedback, aiAnswer: conciseAIAnswer });
              dispatch(setQuestionScore({ questionIndex: i, score: evalResult.score }));
              if (conciseAIAnswer) {
                dispatch(setQuestionAIAnswer({ questionIndex: i, aiAnswer: conciseAIAnswer }));
              }
            } catch (e) {
              const fallback = 0;
              evaluations.push({ score: fallback, feedback: 'Evaluation unavailable.', aiAnswer: '' });
              dispatch(setQuestionScore({ questionIndex: i, score: fallback }));
            }
          }

          const summaryLines = evaluations.map((e, idx) => `Q${idx + 1}: ${e.score}%`).join(' | ');
          dispatch(addChatMessage({ type: 'ai', content: `Per-question scores: ${summaryLines}` }));

          const aiAnswersCompact = evaluations
            .map((e, idx) => e.aiAnswer ? `Q${idx + 1}: ${e.aiAnswer}` : null)
            .filter(Boolean)
            .join('\n');
          if (aiAnswersCompact) {
            dispatch(addChatMessage({ type: 'ai', content: `AI Answers (concise):\n${aiAnswersCompact}` }));
          }

          const finalSummaryRaw = await aiService.generateFinalSummary(
            currentCandidate,
            questions,
            questions.map((q, i) => ({ answer: q.answer, score: evaluations[i]?.score || q.score || 0 }))
          );
          const finalSummary = (finalSummaryRaw || '')
            .replace(/[\*#`]+/g, '')
            .replace(/^\s*[-]+\s*/gm, '')
            .trim();

          const interviewAverage2 = Math.round(
            evaluations.reduce((sum, e) => sum + e.score, 0) / Math.max(1, questions.length)
          );
          const RESUME_WEIGHT2 = 0.2;
          const resumeScore2 = Math.max(0, Math.min(100, currentCandidate?.resumeScore || 0));
          const weightedFinal2 = Math.round(interviewAverage2 * (1 - RESUME_WEIGHT2) + resumeScore2 * RESUME_WEIGHT2);

          dispatch(setFinalResults({ score: weightedFinal2, summary: finalSummary }));
          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${weightedFinal2}%. ${finalSummary}`,
          }));

          dispatch(setStage('completed'));
          if (interviewId && currentCandidate) {
            const latestState = store.getState();
            const latestChat = latestState.interview.chatHistory;
            const questionsWithAI = questions.map((q, i) => ({
              ...q,
              score: evaluations[i]?.score ?? q.score ?? 0,
              aiAnswer: evaluations[i]?.aiAnswer ?? q.aiAnswer,
            }));
            dispatch(moveToCompleted({
              interviewId,
              completedCandidate: {
                ...currentCandidate,
                questions: questionsWithAI,
                finalScore: weightedFinal2,
                finalSummary: finalSummary,
                completedAt: Date.now(),
                chatHistory: latestChat,
              }
            }));
            dispatch(removeInProgressInterview(interviewId));
          }
          setIsEvaluating(false);
        } catch (error) {
          console.error('Final summary error:', error);
          const interviewAverage2Err = Math.round(
            questions.reduce((sum, q) => sum + (q.score || 0), 0) / Math.max(1, questions.length)
          );
          const RESUME_WEIGHT2_ERR = 0.2;
          const resumeScore2Err = Math.max(0, Math.min(100, currentCandidate?.resumeScore || 0));
          const weightedFinal2Err = Math.round(interviewAverage2Err * (1 - RESUME_WEIGHT2_ERR) + resumeScore2Err * RESUME_WEIGHT2_ERR);
          const summary = `Completed ${questions.length} questions with an average score of ${weightedFinal2Err}%.`;

          const summarySanitized2 = summary.replace(/[\*#`]+/g, '').replace(/^\s*[-]+\s*/gm, '').trim();
          dispatch(setFinalResults({ score: weightedFinal2Err, summary: summarySanitized2 }));
          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${weightedFinal2Err}%. ${summary}`,
          }));
          dispatch(setStage('completed'));
          if (interviewId && currentCandidate) {
            const latestState = store.getState();
            const latestChat = latestState.interview.chatHistory;
            const questionsWithExisting2 = questions.map((q) => ({ ...q }));
            dispatch(moveToCompleted({
              interviewId,
              completedCandidate: {
                ...currentCandidate,
                questions: questionsWithExisting2,
                finalScore: weightedFinal2Err,
                finalSummary: summarySanitized2,
                completedAt: Date.now(),
                chatHistory: latestChat,
              }
            }));
            dispatch(removeInProgressInterview(interviewId));
          }
          setIsEvaluating(false);
        }
      }
    }, 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndInterview = () => {
    // Use a simple confirmation without popup blockers
    const confirmed = confirm('Exit and continue later? Your progress will be saved.');
    if (confirmed) {
      // Prevent any pending TTS for current/next question after exit
      setAllowTTS(false);
      // Pause instead of reset so user can resume later
      dispatch(pauseInterview());
    }
  };

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading question...</p>
      </div>
    );
  }

  return (
    <div className="relative max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Interview in Progress</h2>
            <Badge variant="outline" className="text-xs sm:text-sm self-start sm:self-auto">
              {currentCandidate?.name}
            </Badge>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndInterview}
            className="flex items-center space-x-1 sm:space-x-2 self-start sm:self-auto"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Exit</span>
          </Button>
        </div>
        
          <div className="max-w-md mx-auto">
            <Progress value={progress} className="h-2" />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              {Math.round(progress)}% complete • {questions.filter(q => (q.answer || '').trim().length > 0).length}/{questions.length} answered
            </p>
          </div>
      </div>

      {/* Full-screen-ish overlay loader during final evaluation */}
      {(!isQuestionActive && isEvaluating) && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-base font-medium text-foreground">Analyzing your interview answers…</div>
            <div className="text-xs text-muted-foreground">This may take a few moments.</div>
          </div>
        </div>
      )}

      {/* Question Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                {currentQuestionIndex + 1}
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Question {currentQuestionIndex + 1}</CardTitle>
                <Badge className={`${getDifficultyColor(currentQuestion.difficulty)} text-xs`}>
                  {currentQuestion.difficulty.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            {isQuestionActive && !isPlayingAudio && (
              <div className={`flex items-center space-x-2 ${timeRemaining <= 10 ? 'text-red-600' : 'text-foreground'}`}>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-mono font-bold text-base sm:text-lg">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Question Text */}
          <div className="p-4 sm:p-6 bg-accent/30 rounded-lg">
            <h3 className="text-base sm:text-lg font-medium mb-2">Question:</h3>
            <p className="text-foreground text-sm sm:text-base leading-relaxed">
              {currentQuestion.text}
            </p>
          </div>

          {/* Audio Status - removed for final summary; keep only during question reading */}
          {isPlayingAudio && (
            <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 p-2 sm:p-3 rounded-lg">
              <Volume2 className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
              <span className="text-sm sm:text-base">Reading question aloud...</span>
            </div>
          )}

          {/* Answer Input */}
          {/* When not active and evaluating (after last submit), show a centered loader */}
          {!isQuestionActive && isEvaluating && (
            <div className="flex items-center justify-center space-x-2 text-orange-600 bg-orange-50 p-3 sm:p-4 rounded-lg">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              <span className="text-xs sm:text-sm">AI is evaluating your answers, please wait...</span>
            </div>
          )}

          {isQuestionActive && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Your Answer:
                </label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here or use voice input..."
                  className="min-h-24 sm:min-h-32 text-sm sm:text-base"
                  autoFocus
                />
              </div>
              
              {/* Voice Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={isRecording ? stopListening : startListening}
                  disabled={isEvaluating || !hasValidApiKey}
                  className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
                >
                  {isRecording ? <MicOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Mic className="h-3 w-3 sm:h-4 sm:w-4" />}
                  <span className="hidden sm:inline">
                    {!hasValidApiKey ? 'Voice Disabled' : isRecording ? 'Stop Recording' : 'Voice Input'}
                  </span>
                  <span className="sm:hidden">
                    {!hasValidApiKey ? 'Disabled' : isRecording ? 'Stop' : 'Voice'}
                  </span>
                </Button>
                
                {transcript && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetTranscript}
                    className="text-xs"
                  >
                    Clear Voice
                  </Button>
                )}
              </div>

              {/* Status Indicators */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                {isRecording && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <span>Recording...</span>
                  </div>
                )}
                {isListening && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>Listening...</span>
                  </div>
                )}
                {isEvaluating && (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span>Evaluating answer...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0 pt-3 sm:pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => handleSubmit(true)}
                  className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
                  disabled={isEvaluating}
                >
                  <SkipForward className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Skip Question</span>
                </Button>
                
                <Button 
                  onClick={() => handleSubmit(false)}
                  disabled={!answer.trim() || isEvaluating}
                  className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewQuestion;

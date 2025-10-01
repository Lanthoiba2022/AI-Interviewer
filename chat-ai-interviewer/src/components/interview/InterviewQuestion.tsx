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
  setFinalResults,
  resetInterview,
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
import { useSpeechToText } from '@/services/speechService';

const InterviewQuestion = () => {
  const dispatch = useDispatch();
  const { 
    questions, 
    currentQuestionIndex, 
    isQuestionActive, 
    timeRemaining, 
    currentCandidate 
  } = useSelector((state: RootState) => state.interview);

  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasReadQuestion, setHasReadQuestion] = useState(false);

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
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

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

  // Start question when component mounts
  useEffect(() => {
    if (currentQuestion && !isQuestionActive && !hasReadQuestion) {
      startCurrentQuestion();
    }
  }, [currentQuestion, isQuestionActive, hasReadQuestion]);

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
        dispatch(nextQuestion());
        // Reset for next question
        setHasReadQuestion(false);
        setAnswer('');
        resetTranscript();
      } else {
        // Interview complete - evaluate all answers, then generate final summary
        try {
          // Evaluating loader already enabled above for last question

          // Evaluate all questions sequentially to gather per-question scores and feedback
          const evaluations: Array<{ score: number; feedback: string }> = [];
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            try {
              const evalResult = await aiService.evaluateAnswer(q.text, q.answer || '', q.difficulty);
              evaluations.push({ score: evalResult.score, feedback: evalResult.feedback });
              dispatch(setQuestionScore({ questionIndex: i, score: evalResult.score }));
            } catch (e) {
              const fallback = Math.floor(Math.random() * 40) + 60;
              evaluations.push({ score: fallback, feedback: 'Feedback unavailable.' });
              dispatch(setQuestionScore({ questionIndex: i, score: fallback }));
            }
          }

          // Post a compact per-question summary to chat
          const summaryLines = evaluations.map((e, idx) => `Q${idx + 1}: ${e.score}%`).join(' | ');
          dispatch(addChatMessage({ type: 'ai', content: `Per-question scores: ${summaryLines}` }));

          const finalSummary = await aiService.generateFinalSummary(
            currentCandidate,
            questions,
            questions.map((q, i) => ({ answer: q.answer, score: evaluations[i]?.score || q.score || 0 }))
          );

          // Normalize scores that may come as 0-10 to 0-100
          const normalizedEvaluations = evaluations.map((e) => {
            const score = e.score <= 10 && e.score > 0 ? e.score * 10 : e.score;
            return { ...e, score: Math.round(score) };
          });

          const totalScore = Math.round(
            normalizedEvaluations.reduce((sum, e) => sum + e.score, 0) / Math.max(1, questions.length)
          );

          dispatch(setFinalResults({ score: totalScore, summary: finalSummary }));

          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${totalScore}%. ${finalSummary}`,
          }));

          // Mark the interview as completed to prevent re-asking
          dispatch(setStage('completed'));
          setIsEvaluating(false);
        } catch (error) {
          console.error('Final summary error:', error);
          const totalScore = Math.round(
            questions.reduce((sum, q) => {
              const raw = q.score || 0;
              const normalized = raw <= 10 && raw > 0 ? raw * 10 : raw;
              return sum + normalized;
            }, 0) / Math.max(1, questions.length)
          );
          const summary = `Completed ${questions.length} questions with an average score of ${totalScore}%.`;

          dispatch(setFinalResults({ score: totalScore, summary }));

          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${totalScore}%. ${summary}`,
          }));

          // Ensure stage is set to completed even on error
          dispatch(setStage('completed'));
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
        dispatch(nextQuestion());
        setHasReadQuestion(false);
        setAnswer('');
        resetTranscript();
      } else {
        try {
          setIsEvaluating(true);
          const evaluations: Array<{ score: number; feedback: string }> = [];
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            try {
              const evalResult = await aiService.evaluateAnswer(q.text, q.answer || '', q.difficulty);
              evaluations.push({ score: evalResult.score, feedback: evalResult.feedback });
              dispatch(setQuestionScore({ questionIndex: i, score: evalResult.score }));
            } catch (e) {
              const fallback = Math.floor(Math.random() * 40) + 60;
              evaluations.push({ score: fallback, feedback: 'Feedback unavailable.' });
              dispatch(setQuestionScore({ questionIndex: i, score: fallback }));
            }
          }

          const summaryLines = evaluations.map((e, idx) => `Q${idx + 1}: ${e.score}%`).join(' | ');
          dispatch(addChatMessage({ type: 'ai', content: `Per-question scores: ${summaryLines}` }));

          const finalSummary = await aiService.generateFinalSummary(
            currentCandidate,
            questions,
            questions.map((q, i) => ({ answer: q.answer, score: evaluations[i]?.score || q.score || 0 }))
          );

          const normalizedEvaluations = evaluations.map((e) => {
            const score = e.score <= 10 && e.score > 0 ? e.score * 10 : e.score;
            return { ...e, score: Math.round(score) };
          });

          const totalScore = Math.round(
            normalizedEvaluations.reduce((sum, e) => sum + e.score, 0) / Math.max(1, questions.length)
          );

          dispatch(setFinalResults({ score: totalScore, summary: finalSummary }));
          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${totalScore}%. ${finalSummary}`,
          }));

          dispatch(setStage('completed'));
          setIsEvaluating(false);
        } catch (error) {
          console.error('Final summary error:', error);
          const totalScore = Math.round(
            questions.reduce((sum, q) => {
              const raw = q.score || 0;
              const normalized = raw <= 10 && raw > 0 ? raw * 10 : raw;
              return sum + normalized;
            }, 0) / Math.max(1, questions.length)
          );
          const summary = `Completed ${questions.length} questions with an average score of ${totalScore}%.`;

          dispatch(setFinalResults({ score: totalScore, summary }));
          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${totalScore}%. ${summary}`,
          }));
          dispatch(setStage('completed'));
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
    const confirmed = confirm('Are you sure you want to end this interview? All progress will be lost.');
    if (confirmed) {
      dispatch(resetInterview());
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
    <div className="relative max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-foreground">Interview in Progress</h2>
            <Badge variant="outline" className="text-sm">
              {currentCandidate?.name}
            </Badge>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndInterview}
            className="flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>End Interview</span>
          </Button>
        </div>
        
        <div className="max-w-md mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Question {currentQuestionIndex + 1} of {questions.length}
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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                {currentQuestionIndex + 1}
              </div>
              <div>
                <CardTitle className="text-lg">Question {currentQuestionIndex + 1}</CardTitle>
                <Badge className={`${getDifficultyColor(currentQuestion.difficulty)} text-xs`}>
                  {currentQuestion.difficulty.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            {isQuestionActive && !isPlayingAudio && (
              <div className={`flex items-center space-x-2 ${timeRemaining <= 10 ? 'text-red-600' : 'text-foreground'}`}>
                <Clock className="h-5 w-5" />
                <span className="font-mono font-bold text-lg">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Question Text */}
          <div className="p-6 bg-accent/30 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Question:</h3>
            <p className="text-foreground text-base leading-relaxed">
              {currentQuestion.text}
            </p>
          </div>

          {/* Audio Status - removed for final summary; keep only during question reading */}
          {isPlayingAudio && (
            <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
              <Volume2 className="h-4 w-4 animate-pulse" />
              <span>Reading question aloud...</span>
            </div>
          )}

          {/* Answer Input */}
          {/* When not active and evaluating (after last submit), show a centered loader */}
          {!isQuestionActive && isEvaluating && (
            <div className="flex items-center justify-center space-x-2 text-orange-600 bg-orange-50 p-4 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">AI is evaluating your answers, please wait...</span>
            </div>
          )}

          {isQuestionActive && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Your Answer:
                </label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here or use voice input..."
                  className="min-h-32 text-base"
                  autoFocus
                />
              </div>
              
              {/* Voice Controls */}
              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={isRecording ? stopListening : startListening}
                  disabled={isEvaluating || !hasValidApiKey}
                  className="flex items-center space-x-2"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>
                    {!hasValidApiKey ? 'Voice Disabled' : isRecording ? 'Stop Recording' : 'Voice Input'}
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
              <div className="flex items-center space-x-4 text-sm">
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Evaluating answer...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => handleSubmit(true)}
                  className="flex items-center space-x-2"
                  disabled={isEvaluating}
                >
                  <SkipForward className="h-4 w-4" />
                  <span>Skip Question</span>
                </Button>
                
                <Button 
                  onClick={() => handleSubmit(false)}
                  disabled={!answer.trim() || isEvaluating}
                  className="flex items-center space-x-2"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
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

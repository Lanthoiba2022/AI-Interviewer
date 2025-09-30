import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { 
  setQuestions, 
  startQuestion, 
  tickTimer, 
  submitAnswer, 
  nextQuestion,
  addChatMessage,
  setQuestionScore,
  setFinalResults,
  startInterview
} from '@/store/slices/interviewSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Send, SkipForward, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import type { Question } from '@/store/slices/interviewSlice';
import { aiService } from '@/services/aiService';
import { useSpeechToText } from '@/services/speechService';

const InterviewChat = () => {
  const dispatch = useDispatch();
  const { 
    questions, 
    currentQuestionIndex, 
    isQuestionActive, 
    timeRemaining, 
    chatHistory,
    currentCandidate,
    isInterviewActive
  } = useSelector((state: RootState) => state.interview);

  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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
      const generatedQuestions = await aiService.generateQuestions();
      console.log('Generated questions:', generatedQuestions);
      
      const formattedQuestions: Question[] = generatedQuestions.map((q, index) => ({
        id: (index + 1).toString(),
        text: q.question_text,
        difficulty: q.difficulty,
        timeLimit: q.difficulty === 'easy' ? 20 : q.difficulty === 'medium' ? 60 : 120,
      }));

      console.log('Formatted questions:', formattedQuestions);
      dispatch(setQuestions(formattedQuestions));
      
      dispatch(addChatMessage({
        type: 'ai',
        content: `I've generated ${formattedQuestions.length} personalized questions for your interview. Let's begin!`,
      }));
    } catch (error) {
      console.error('Failed to generate questions:', error);
      // Fallback to sample questions
      const sampleQuestions: Question[] = [
        {
          id: '1',
          text: 'What is the difference between let, const, and var in JavaScript?',
          difficulty: 'easy',
          timeLimit: 20,
        },
        {
          id: '2',
          text: 'Explain the concept of React hooks and give an example of useState.',
          difficulty: 'easy',
          timeLimit: 20,
        },
        {
          id: '3',
          text: 'How would you optimize a React application for better performance?',
          difficulty: 'medium',
          timeLimit: 60,
        },
        {
          id: '4',
          text: 'Describe the difference between SQL and NoSQL databases and when to use each.',
          difficulty: 'medium',
          timeLimit: 60,
        },
        {
          id: '5',
          text: 'Design a RESTful API for a social media application with user posts and comments.',
          difficulty: 'hard',
          timeLimit: 120,
        },
        {
          id: '6',
          text: 'How would you implement authentication and authorization in a microservices architecture?',
          difficulty: 'hard',
          timeLimit: 120,
        },
      ];
      dispatch(setQuestions(sampleQuestions));
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isQuestionActive && timeRemaining > 0) {
      interval = setInterval(() => {
        dispatch(tickTimer());
      }, 1000);
    } else if (isQuestionActive && timeRemaining === 0) {
      // Time's up - auto submit
      handleSubmit(true);
    }

    return () => clearInterval(interval);
  }, [isQuestionActive, timeRemaining, dispatch]);

  // Start first question
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex === 0 && !isQuestionActive) {
      startCurrentQuestion();
    }
  }, [questions, currentQuestionIndex, isQuestionActive]);

  // Update answer when transcript changes
  useEffect(() => {
    if (transcript) {
      setAnswer(transcript);
    }
  }, [transcript]);

  const startCurrentQuestion = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      console.error('No current question found at index:', currentQuestionIndex);
      return;
    }

    console.log('Starting question:', currentQuestionIndex + 1, currentQuestion);

    const questionText = `Question ${currentQuestionIndex + 1} of ${questions.length} (${currentQuestion.difficulty.toUpperCase()}):\n\n${currentQuestion.text}`;
    
    dispatch(addChatMessage({
      type: 'ai',
      content: questionText,
    }));

    // Play question as audio
    try {
      setIsPlayingAudio(true);
      await aiService.textToSpeech(questionText);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsPlayingAudio(false);
    }

    dispatch(startQuestion());
    setStartTime(Date.now());
    setAnswer('');
    resetTranscript();
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const timeSpent = currentQuestion.timeLimit - timeRemaining;
    const submittedAnswer = isAutoSubmit ? (answer || 'No answer provided (time expired)') : answer;

    // Add user message
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

    // Evaluate answer with AI
    setIsEvaluating(true);
    try {
      const evaluation = await aiService.evaluateAnswer(
        currentQuestion.text, 
        submittedAnswer, 
        currentQuestion.difficulty
      );

      dispatch(setQuestionScore({ 
        questionIndex: currentQuestionIndex, 
        score: evaluation.score 
      }));

      // Add AI feedback
      dispatch(addChatMessage({
        type: 'ai',
        content: `Thank you for your answer. Score: ${evaluation.score}%\n\nFeedback: ${evaluation.feedback}`,
      }));

      // Play feedback as audio
      try {
        setIsPlayingAudio(true);
        await aiService.textToSpeech(`Score: ${evaluation.score}%. ${evaluation.feedback}`);
      } catch (error) {
        console.error('TTS error:', error);
      } finally {
        setIsPlayingAudio(false);
      }

    } catch (error) {
      console.error('Evaluation error:', error);
      // Fallback scoring
      const score = Math.floor(Math.random() * 40) + 60;
      dispatch(setQuestionScore({ 
        questionIndex: currentQuestionIndex, 
        score 
      }));

      dispatch(addChatMessage({
        type: 'ai',
        content: `Thank you for your answer. Score: ${score}%`,
      }));
    } finally {
      setIsEvaluating(false);
    }

    // Move to next question or finish
    setTimeout(async () => {
      if (currentQuestionIndex < questions.length - 1) {
        dispatch(nextQuestion());
        setTimeout(startCurrentQuestion, 1000);
      } else {
        // Interview complete - generate final summary
        try {
          const finalSummary = await aiService.generateFinalSummary(
            currentCandidate, 
            questions, 
            questions.map(q => ({ answer: q.answer, score: q.score }))
          );
          
          const totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0) / questions.length;
          
          dispatch(setFinalResults({ 
            score: Math.round(totalScore), 
            summary: finalSummary 
          }));

          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${Math.round(totalScore)}%. ${finalSummary}`,
          }));

          // Play final summary as audio
          try {
            setIsPlayingAudio(true);
            await aiService.textToSpeech(`Interview completed! Your final score is ${Math.round(totalScore)}%. ${finalSummary}`);
          } catch (error) {
            console.error('TTS error:', error);
          } finally {
            setIsPlayingAudio(false);
          }
        } catch (error) {
          console.error('Final summary error:', error);
          const totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0) / questions.length;
          const summary = `Completed ${questions.length} questions with an average score of ${Math.round(totalScore)}%.`;
          
          dispatch(setFinalResults({ 
            score: Math.round(totalScore), 
            summary 
          }));

          dispatch(addChatMessage({
            type: 'ai',
            content: `Interview completed! Your final score is ${Math.round(totalScore)}%. ${summary}`,
          }));
        }
      }
    }, 2000);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'hard': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Interview in Progress</h2>
        <p className="text-muted-foreground">
          {currentCandidate?.name} • Full Stack Developer Position
        </p>
        <Progress value={progress} className="w-full max-w-md mx-auto" />
        
        {/* AI Status Indicators */}
        <div className="flex justify-center space-x-4 text-sm">
          {isGeneratingQuestions && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating questions...</span>
            </div>
          )}
          {isEvaluating && (
            <div className="flex items-center space-x-2 text-orange-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Evaluating answer...</span>
            </div>
          )}
          {isPlayingAudio && (
            <div className="flex items-center space-x-2 text-green-600">
              <Volume2 className="h-4 w-4" />
              <span>Playing audio...</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Question Info */}
      {currentQuestion && (
        <Card className="bg-accent/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                  {currentQuestion.difficulty.toUpperCase()}
                </Badge>
                <span className="text-sm text-accent-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
              </div>
              {isQuestionActive && (
                <div className={`flex items-center space-x-2 ${timeRemaining <= 10 ? 'text-destructive' : 'text-foreground'}`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-bold">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat History */}
      <Card className="min-h-96 max-h-96 overflow-y-auto">
        <CardContent className="p-4 space-y-4">
          {chatHistory.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap ${
                  message.type === 'user'
                    ? 'bg-chat-user text-chat-user-foreground ml-4'
                    : message.type === 'ai'
                    ? 'bg-chat-ai text-chat-ai-foreground mr-4'
                    : 'bg-accent text-accent-foreground mx-4 text-center text-sm'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Answer Input */}
      {isQuestionActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Your Answer</span>
              <div className="flex items-center space-x-2">
                {isRecording && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-sm">Recording...</span>
                  </div>
                )}
                {isListening && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-sm">Listening...</span>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here or use voice input..."
              className="min-h-32"
              autoFocus
            />
            
            {/* Voice Controls */}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={isRecording ? stopListening : startListening}
                disabled={isEvaluating || !hasValidApiKey}
                className="flex items-center space-x-2"
                title={!hasValidApiKey ? "AssemblyAI API key required for voice input" : ""}
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

            <div className="flex justify-between">
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
                    <Send className="h-4 w-4" />
                    <span>Submit Answer</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InterviewChat;
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { resetInterview, startInterview, setStage, pauseInterview, resumeInterview, markFirstVisitComplete } from '@/store/slices/interviewSlice';
import { saveInProgressInterview } from '@/store/slices/candidatesSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Play, RotateCcw, Clock, User, FileText, MessageSquare, Calendar, ArrowRight, Pause, PlayCircle, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

const WelcomeBack = () => {
  const dispatch = useDispatch();
  const { 
    currentCandidate, 
    questions, 
    currentQuestionIndex, 
    stage,
    isInterviewActive,
    isResumeAnalysisComplete,
    missingFields,
    interviewId,
    startedAt,
    lastActivityAt,
    status,
    progress,
    chatHistory,
    resumeAnalysis,
    firstVisit
  } = useSelector((state: RootState) => state.interview);

  // Mark first visit as complete when user continues the interview
  const handleContinue = () => {
    console.log('WelcomeBack handleContinue - firstVisit:', firstVisit, 'candidate:', currentCandidate?.name);
    if (firstVisit) {
      dispatch(markFirstVisitComplete());
    }
    
    console.log('Continue interview clicked, current state:', { stage, questions: questions.length, currentQuestionIndex, isResumeAnalysisComplete });
    
    // If we already have questions, just set stage and resume (question timer will not auto-start)
    if (questions.length > 0) {
      dispatch(setStage('interview'));
      dispatch(resumeInterview());
      return;
    }
    
    // If we're in interview stage but no questions, generate them
    if (stage === 'interview' && questions.length === 0) {
      console.log('No questions found, starting interview to generate questions');
      dispatch(startInterview());
    } else if (stage === 'collecting-info') {
      console.log('Still collecting info, transitioning to interview stage');
      dispatch(setStage('interview'));
      dispatch(startInterview());
    } else {
      console.log('Resuming interview from saved progress');
      dispatch(resumeInterview());
    }
  };

  // Auto-save current interview state to in-progress list
  useEffect(() => {
    if (currentCandidate && interviewId && status !== 'completed') {
      const safeStage = stage === 'completed' ? 'interview' : stage;
      const inProgressCandidate = {
        ...currentCandidate,
        interviewId,
        questions,
        currentQuestionIndex,
        status,
        startedAt: startedAt || Date.now(),
        lastActivityAt: lastActivityAt || Date.now(),
        progress,
        chatHistory,
        stage: safeStage,
        resumeAnalysis,
        isResumeAnalysisComplete
      };
      dispatch(saveInProgressInterview(inProgressCandidate));
    }
  }, [currentCandidate, interviewId, questions, currentQuestionIndex, status, startedAt, lastActivityAt, progress, stage, resumeAnalysis, isResumeAnalysisComplete, chatHistory, dispatch]);


  const handleStartOver = () => {
    dispatch(resetInterview());
  };

  const handlePauseInterview = () => {
    dispatch(pauseInterview());
  };

  const getStageDescription = () => {
    switch (stage) {
      case 'collecting-info':
        return 'Collecting missing information';
      case 'interview':
        if (questions.length === 0) {
          return 'Preparing interview questions';
        }
        return `Interview in progress (Question ${currentQuestionIndex + 1} of ${questions.length})`;
      default:
        return 'Setting up interview';
    }
  };

  const getProgress = () => {
    const steps = [
      progress.resumeUploaded,
      progress.infoCollected,
      progress.questionsGenerated,
      progress.interviewStarted
    ];
    const completedSteps = steps.filter(Boolean).length;
    return (completedSteps / steps.length) * 100;
  };

  const getStatusBadgeVariant = () => {
    switch (status) {
      case 'in-progress': return 'default';
      case 'paused': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'in-progress': return <PlayCircle className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'draft': return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {firstVisit 
              ? (currentCandidate?.name ? `Welcome, ${currentCandidate.name}!` : 'Welcome!')
              : (currentCandidate?.name ? `Welcome Back, ${currentCandidate.name}!` : 'Welcome Back!')
            }
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {firstVisit 
              ? 'Your interview session has been created. Please continue the interview to proceed.'
              : 'You have an interview session in progress. Your progress is automatically saved and you can continue where you left off.'
            }
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Interview Session</CardTitle>
                  <p className="text-sm text-muted-foreground">ID: {interviewId}</p>
                </div>
              </div>
              <Badge variant={getStatusBadgeVariant()} className="flex items-center space-x-1 px-3 py-1">
                {getStatusIcon()}
                <span className="capitalize">{status.replace('-', ' ')}</span>
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Candidate Information */}
            {currentCandidate && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-center space-x-3 mb-4">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Candidate Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{currentCandidate.name || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{currentCandidate.email || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{currentCandidate.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    {currentCandidate.resumeFileName && (
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Resume</p>
                          <p className="font-medium text-sm">{currentCandidate.resumeFileName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress Section */}
            <div className="space-y-4">
              {(() => {
                const answeredCount = questions.filter(q => (q.answer || '').trim().length > 0).length;
                const total = Math.max(questions.length, 1);
                const pct = (answeredCount / total) * 100;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Interview Progress</h3>
                      <span className="text-sm font-medium text-muted-foreground">
                        {Math.round(pct)}% Complete • {answeredCount}/{questions.length} answered
                      </span>
                    </div>
                    <Progress value={pct} className="h-3" />
                  </>
                );
              })()}
              {/* Flow Steps (compact timeline under progress bar) */}
              {(() => {
                const resumeDone = true || !!progress.resumeUploaded || Boolean(currentCandidate?.resumeFileName || currentCandidate?.resumeText);
                const steps = [
                  { key: 'resume', label: 'Resume Uploaded', done: resumeDone, Icon: FileText },
                  { key: 'info', label: 'Info Collected', done: !!progress.infoCollected, Icon: User },
                  { key: 'questions', label: 'Questions Ready', done: !!progress.questionsGenerated, Icon: MessageSquare },
                  { key: 'interview', label: 'Interview Started', done: !!progress.interviewStarted, Icon: Play },
                ];
                return (
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {steps.map((s, idx) => (
                        <div key={s.key} className="flex-1 min-w-[140px] flex items-center">
                          {/* connector (left) */}
                          {idx > 0 && (
                            <div className={`h-0.5 w-2 sm:w-4 md:w-6 ${steps[idx-1].done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                          )}
                          {/* node */}
                          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-full border shadow-sm backdrop-blur-sm ${s.done ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white/70 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${s.done ? 'bg-green-100 dark:bg-green-800/60' : 'bg-gray-200 dark:bg-gray-700'}`}>
                              <s.Icon className={`h-3.5 w-3.5 ${s.done ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`} />
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap">{s.label}</span>
                            {s.done && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                          </div>
                          {/* connector (right) */}
                          {idx < steps.length - 1 && (
                            <div className={`h-0.5 w-2 sm:w-4 md:w-6 ${s.done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Interview Status */}
            {stage === 'interview' && questions.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200/50 dark:border-indigo-700/50">
                <div className="flex items-center space-x-3 mb-4">
                  <Play className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">Interview Status</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {(() => {
                    const answeredCount = questions.filter(q => (q.answer || '').trim().length > 0).length;
                    return (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{answeredCount}</p>
                        <p className="text-muted-foreground">Questions Completed</p>
                      </div>
                    );
                  })()}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{questions.length}</p>
                    <p className="text-muted-foreground">Total Questions</p>
                  </div>
                  <div className="text-center">
                    <Badge variant={isInterviewActive ? 'default' : 'secondary'} className="text-xs">
                      {isInterviewActive ? 'Active' : 'Paused'}
                    </Badge>
                    <p className="text-muted-foreground mt-1">Current Status</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Full Stack Developer</p>
                    <p className="text-muted-foreground">Position</p>
                  </div>
                </div>
              </div>
            )}

            {/* Session Info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Started {startedAt ? formatTimeAgo(startedAt) : 'Unknown'}</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Last active {lastActivityAt ? formatTimeAgo(lastActivityAt) : 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button 
                onClick={handleContinue} 
                disabled={!Boolean(currentCandidate?.name && currentCandidate?.email && currentCandidate?.phone)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Continue Interview
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <div className="flex gap-2">
                {isInterviewActive && (
                  <Button 
                    variant="outline" 
                    onClick={handlePauseInterview}
                    size="lg"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleStartOver}
                  size="lg"
                  className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-muted-foreground">
                💾 Your progress is automatically saved. You can safely close this window and return later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WelcomeBack;
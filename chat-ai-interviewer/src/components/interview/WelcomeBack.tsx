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
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-3 sm:mb-4">
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent px-2 leading-tight break-words">
            {firstVisit 
              ? (currentCandidate?.name ? `Welcome, ${currentCandidate.name}!` : 'Welcome!')
              : (currentCandidate?.name ? `Welcome Back, ${currentCandidate.name}!` : 'Welcome Back!')
            }
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2 leading-relaxed">
            {firstVisit 
              ? 'Your interview session has been created. Please continue the interview to proceed.'
              : 'You have an interview session in progress. Your progress is automatically saved and you can continue where you left off.'
            }
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl">Interview Session</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">ID: {interviewId}</p>
                </div>
              </div>
              <Badge variant={getStatusBadgeVariant()} className="flex items-center space-x-1 px-2 sm:px-3 py-1 self-start sm:self-auto">
                {getStatusIcon()}
                <span className="capitalize text-xs sm:text-sm">{status.replace('-', ' ')}</span>
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8">
            {/* Candidate Information */}
            {currentCandidate && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-blue-900 dark:text-blue-100">Candidate Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">Name</p>
                        <p className="font-medium text-sm sm:text-base truncate">{currentCandidate.name || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">Email</p>
                        <p className="font-medium text-sm sm:text-base truncate">{currentCandidate.email || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium text-sm sm:text-base truncate">{currentCandidate.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    {currentCandidate.resumeFileName && (
                      <div className="flex items-center space-x-3">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-muted-foreground">Resume</p>
                          <p className="font-medium text-xs sm:text-sm truncate">{currentCandidate.resumeFileName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress Section */}
            <div className="space-y-3 sm:space-y-4">
              {(() => {
                const answeredCount = questions.filter(q => (q.answer || '').trim().length > 0).length;
                const total = Math.max(questions.length, 1);
                const pct = (answeredCount / total) * 100;
                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                      <h3 className="text-base sm:text-lg font-semibold">Interview Progress</h3>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {Math.round(pct)}% Complete • {answeredCount}/{questions.length} answered
                      </span>
                    </div>
                    <Progress value={pct} className="h-2 sm:h-3" />
                  </>
                );
              })()}
              {/* Flow Steps (compact timeline under progress bar) */}
              {(() => {
                const resumeDone = true || !!progress.resumeUploaded || Boolean(currentCandidate?.resumeFileName || currentCandidate?.resumeText);
                const steps = [
                  { key: 'resume', label: 'Resume', shortLabel: 'Resume', done: resumeDone, Icon: FileText },
                  { key: 'info', label: 'Info Collected', shortLabel: 'Info', done: !!progress.infoCollected, Icon: User },
                  { key: 'questions', label: 'Questions Ready', shortLabel: 'Questions', done: !!progress.questionsGenerated, Icon: MessageSquare },
                  { key: 'interview', label: 'Interview Started', shortLabel: 'Interview', done: !!progress.interviewStarted, Icon: Play },
                ];
                return (
                  <div className="mt-2 sm:mt-3">
                    <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                      {steps.map((s, idx) => (
                        <div key={s.key} className="flex-1 min-w-[80px] sm:min-w-[120px] flex items-center">
                          {/* connector (left) */}
                          {idx > 0 && (
                            <div className={`h-0.5 w-1 sm:w-2 md:w-4 ${steps[idx-1].done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                          )}
                          {/* node */}
                          <div className={`flex items-center gap-1 sm:gap-2 px-1 sm:px-2 py-1 sm:py-1.5 rounded-full border shadow-sm backdrop-blur-sm ${s.done ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white/70 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'}`}>
                            <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${s.done ? 'bg-green-100 dark:bg-green-800/60' : 'bg-gray-200 dark:bg-gray-700'}`}>
                              <s.Icon className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 ${s.done ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`} />
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">{s.label}</span>
                            <span className="text-xs font-medium whitespace-nowrap sm:hidden">{s.shortLabel}</span>
                            {s.done && <CheckCircle className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-green-600" />}
                          </div>
                          {/* connector (right) */}
                          {idx < steps.length - 1 && (
                            <div className={`h-0.5 w-1 sm:w-2 md:w-4 ${s.done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
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
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 sm:p-6 border border-indigo-200/50 dark:border-indigo-700/50">
                <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-indigo-900 dark:text-indigo-100">Interview Status</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                  {(() => {
                    const answeredCount = questions.filter(q => (q.answer || '').trim().length > 0).length;
                    return (
                      <div className="text-center">
                        <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{answeredCount}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Questions Completed</p>
                      </div>
                    );
                  })()}
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{questions.length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Questions</p>
                  </div>
                  <div className="text-center">
                    <Badge variant={isInterviewActive ? 'default' : 'secondary'} className="text-xs">
                      {isInterviewActive ? 'Active' : 'Paused'}
                    </Badge>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Current Status</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm font-medium">Full Stack Developer</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Position</p>
                  </div>
                </div>
              </div>
            )}

            {/* Session Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-muted-foreground bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Started {startedAt ? formatTimeAgo(startedAt) : 'Unknown'}</span>
                </div>
                <Separator orientation="vertical" className="h-3 sm:h-4 hidden sm:block" />
                <div className="flex items-center space-x-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Last active {lastActivityAt ? formatTimeAgo(lastActivityAt) : 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
              <Button 
                onClick={handleContinue} 
                disabled={!Boolean(currentCandidate?.name && currentCandidate?.email && currentCandidate?.phone)}
                className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg h-12 sm:h-14"
                size="lg"
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base font-medium">Continue Interview</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
              </Button>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 w-full sm:w-auto">
                {isInterviewActive && (
                  <Button 
                    variant="outline" 
                    onClick={handlePauseInterview}
                    size="lg"
                    className="w-full sm:w-auto border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20 dark:hover:border-orange-700 dark:hover:text-orange-300 h-12 sm:h-14"
                  >
                    <Pause className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="text-sm sm:text-base font-medium">Pause</span>
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleStartOver}
                  size="lg"
                  className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 dark:hover:text-red-300 h-12 sm:h-14"
                >
                  <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base font-medium">Start Over</span>
                </Button>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs sm:text-sm text-muted-foreground px-2">
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
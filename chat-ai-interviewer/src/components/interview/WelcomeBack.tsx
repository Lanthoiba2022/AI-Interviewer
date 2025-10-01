import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { resetInterview, startInterview, setStage } from '@/store/slices/interviewSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, RotateCcw, Clock } from 'lucide-react';

const WelcomeBack = () => {
  const dispatch = useDispatch();
  const { 
    currentCandidate, 
    questions, 
    currentQuestionIndex, 
    stage,
    isInterviewActive,
    isResumeAnalysisComplete,
    missingFields
  } = useSelector((state: RootState) => state.interview);

  const handleContinue = () => {
    console.log('Continue interview clicked, current state:', { stage, questions: questions.length, currentQuestionIndex, isResumeAnalysisComplete });
    
    // Check if resume analysis is complete before allowing continuation
    if (!isResumeAnalysisComplete) {
      console.log('Resume analysis not complete, cannot continue');
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
      console.log('Continuing existing interview');
      dispatch(startInterview());
    }
  };

  const handleStartOver = () => {
    dispatch(resetInterview());
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
    // Candidate Info Bar: 100% only when name/email/phone are present
    const hasAllInfo = !!(currentCandidate?.name && currentCandidate?.email && currentCandidate?.phone);
    if (!hasAllInfo) return 50; // midway until complete
    if (stage !== 'interview') return 100;
    // During interview, keep info bar at 100%
    return 100;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Welcome Back!</h2>
        <p className="text-muted-foreground text-lg">
          You have an interview session in progress
        </p>
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resume Session</span>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>In Progress</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Candidate Info */}
          {currentCandidate && (
            <div className="p-4 bg-accent/50 rounded-lg">
              <h3 className="font-medium text-accent-foreground mb-2">Candidate Information</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  <span className="font-medium">{currentCandidate.name || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-medium">{currentCandidate.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  <span className="font-medium">{currentCandidate.phone || 'Not provided'}</span>
                </div>
                {currentCandidate.resumeFileName && (
                  <div>
                    <span className="text-muted-foreground">Resume: </span>
                    <span className="font-medium">{currentCandidate.resumeFileName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Candidate Info</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(getProgress())}%
              </span>
            </div>
            <Progress value={getProgress()} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {getStageDescription()}
            </p>
          </div>

          {/* Interview Status */}
          {stage === 'interview' && questions.length > 0 && (
            <div className="p-4 bg-accent/30 rounded-lg">
              <h3 className="font-medium mb-2">Current Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Questions Completed: </span>
                  <span className="font-medium">{currentQuestionIndex}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Questions: </span>
                  <span className="font-medium">{questions.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge variant="outline" className="text-xs">
                    {isInterviewActive ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Position: </span>
                  <span className="font-medium">Full Stack Developer</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleContinue} 
              disabled={!Boolean(currentCandidate?.name && currentCandidate?.email && currentCandidate?.phone)}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Continue Interview</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleStartOver}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Start Over</span>
            </Button>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Your progress is automatically saved. You can safely close this window and return later.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeBack;
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { resetInterview } from '@/store/slices/interviewSlice';
import { addCompletedCandidate } from '@/store/slices/candidatesSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, RotateCcw, BarChart3, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InterviewChatHistory from './InterviewChatHistory';

const InterviewComplete = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [showChatHistory, setShowChatHistory] = useState(false);
  const { 
    currentCandidate, 
    questions, 
    finalScore, 
    finalSummary, 
    chatHistory 
  } = useSelector((state: RootState) => state.interview);

  const handleSaveResults = () => {
    if (!currentCandidate || finalScore === undefined) {
      toast({
        title: "Error",
        description: "Missing interview data. Cannot save results.",
        variant: "destructive",
      });
      return;
    }

    // Require the real AI-generated final summary; do not fallback
    if (!finalSummary || finalSummary.trim().length === 0) {
      toast({
        title: "Summary not ready",
        description: "Please wait for the AI summary to generate before saving.",
        variant: "destructive",
      });
      return;
    }

    dispatch(addCompletedCandidate({
      ...currentCandidate,
      questions,
      finalScore,
      finalSummary: finalSummary,
      completedAt: Date.now(),
      chatHistory,
    }));

    toast({
      title: "Results saved",
      description: "Interview results have been saved to the dashboard.",
    });

    // Reset for next candidate
    dispatch(resetInterview());
  };

  const handleNewInterview = () => {
    dispatch(resetInterview());
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-success text-success-foreground';
    if (score >= 60) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  if (!currentCandidate || finalScore === undefined) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-muted-foreground">No interview data available.</p>
        <Button onClick={handleNewInterview} className="mt-4">
          Start New Interview
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-success" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Interview Completed!</h2>
        <p className="text-muted-foreground text-lg">
          Thank you {currentCandidate.name} for completing the interview.
        </p>
      </div>

      {/* Results Overview */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Interview Results</span>
            <Badge className={getScoreBadgeColor(finalScore)}>
              {finalScore}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-accent/50 rounded-lg">
              <div className={`text-3xl font-bold ${getScoreColor(finalScore)}`}>
                {finalScore}%
              </div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>
            <div className="text-center p-4 bg-accent/50 rounded-lg">
              <div className="text-3xl font-bold text-foreground">
                {questions.length}
              </div>
              <p className="text-sm text-muted-foreground">Questions Answered</p>
            </div>
            <div className="text-center p-4 bg-accent/50 rounded-lg">
              <div className="text-3xl font-bold text-foreground">
                {getPerformanceLevel(finalScore)}
              </div>
              <p className="text-sm text-muted-foreground">Performance Level</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Interview Progress</span>
              <span>100%</span>
            </div>
            <Progress value={100} className="h-3" />
          </div>

          {/* Summary */}
          <div className="p-4 bg-accent/30 rounded-lg">
            <h3 className="font-medium mb-2">AI Summary</h3>
            <p className="text-sm text-accent-foreground whitespace-pre-wrap">
              {finalSummary}
            </p>
          </div>

          {/* Question Breakdown */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Question Breakdown</span>
            </h3>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Q{index + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {question.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {question.text}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${getScoreColor(question.score || 0)}`}>
                      {question.score || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {question.timeSpent || 0}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Information */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{currentCandidate.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{currentCandidate.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{currentCandidate.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resume</p>
              <p className="font-medium">{currentCandidate.resumeFileName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button 
          onClick={handleSaveResults}
          className="min-w-32"
        >
          Save Results
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowChatHistory(!showChatHistory)}
          className="flex items-center space-x-2 min-w-32"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{showChatHistory ? 'Hide Chat' : 'View Chat'}</span>
        </Button>
        <Button 
          variant="outline" 
          onClick={handleNewInterview}
          className="flex items-center space-x-2 min-w-32"
        >
          <RotateCcw className="h-4 w-4" />
          <span>New Interview</span>
        </Button>
      </div>

      {/* Chat History */}
      {showChatHistory && (
        <div className="mt-8">
          <InterviewChatHistory />
        </div>
      )}
    </div>
  );
};

export default InterviewComplete;
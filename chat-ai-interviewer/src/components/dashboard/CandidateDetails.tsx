import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, User, Mail, Phone, FileText, Clock, BarChart3, Bot, MessageCircle } from 'lucide-react';
import type { CompletedCandidate } from '@/store/slices/candidatesSlice';

interface CandidateDetailsProps {
  candidate: CompletedCandidate;
  onBack: () => void;
}

const CandidateDetails = ({ candidate, onBack }: CandidateDetailsProps) => {
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

  const averageQuestionScore = candidate.questions.reduce((sum, q) => {
    const raw = q.score || 0;
    const normalized = raw <= 10 && raw > 0 ? raw * 10 : raw;
    return sum + normalized;
  }, 0) / candidate.questions.length;

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
        <Badge className={getScoreBadgeColor(candidate.finalScore)}>
          Final Score: {candidate.finalScore}%
        </Badge>
      </div>

      {/* Candidate Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Candidate Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{candidate.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{candidate.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{candidate.phone}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Resume</p>
                <p className="font-medium text-sm">{candidate.resumeFileName}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className={`text-3xl font-bold ${getScoreColor(candidate.finalScore)}`}>
              {candidate.finalScore}%
            </div>
            <p className="text-sm text-muted-foreground">Final Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-foreground">
              {candidate.questions.length}
            </div>
            <p className="text-sm text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-foreground">
              {getPerformanceLevel(candidate.finalScore)}
            </div>
            <p className="text-sm text-muted-foreground">Performance Level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-foreground">
              {new Date(candidate.completedAt).toLocaleDateString()}
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      <Card>
        <CardHeader>
          <CardTitle>AI Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {candidate.finalSummary}
          </p>
        </CardContent>
      </Card>

      {/* Questions & Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Question Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidate.questions.map((question, index) => (
            <div key={question.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">Q{index + 1}</Badge>
                  <Badge className={getDifficultyColor(question.difficulty)}>
                    {question.difficulty.toUpperCase()}
                  </Badge>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(question.timeSpent || 0)}</span>
                  </div>
                </div>
                <Badge className={getScoreBadgeColor((question.score || 0) <= 10 && (question.score || 0) > 0 ? (question.score || 0) * 10 : (question.score || 0))}>
                  {Math.round(((question.score || 0) <= 10 && (question.score || 0) > 0 ? (question.score || 0) * 10 : (question.score || 0)))}%
                </Badge>
              </div>
              
              <div>
                <p className="font-medium text-foreground mb-2">{question.text}</p>
                <div className="bg-accent/30 p-3 rounded-md">
                  <p className="text-sm text-accent-foreground">
                    <span className="font-medium">Answer: </span>
                    {question.answer || 'No answer provided'}
                  </p>
                </div>
                {question.aiAnswer && (
                  <div className="bg-muted/40 p-3 rounded-md mt-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">AI Answer: </span>
                      {question.aiAnswer}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>Time Limit: {formatTime(question.timeLimit)}</span>
                <span>•</span>
                <span>Time Used: {formatTime(question.timeSpent || 0)}</span>
                <span>•</span>
                <span>Score: {Math.round(((question.score || 0) <= 10 && (question.score || 0) > 0 ? (question.score || 0) * 10 : (question.score || 0)))}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chat History - Styled like Interview view */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Interview Chat History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto space-y-4">
            {candidate.chatHistory.map((message, idx) => (
              <div
                key={`${message.id}-${message.timestamp}-${idx}`}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-100 text-blue-900 ml-4'
                      : message.type === 'ai'
                      ? 'bg-gray-100 text-gray-900 mr-4'
                      : 'bg-yellow-100 text-yellow-900 mx-4 text-center'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : message.type === 'ai' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {message.type === 'user' ? 'You' : message.type === 'ai' ? 'AI Interviewer' : 'System'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateDetails;
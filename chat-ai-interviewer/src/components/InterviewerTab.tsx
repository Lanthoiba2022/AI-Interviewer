import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setSearchTerm, setSortBy, setSortOrder } from '@/store/slices/candidatesSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Search, ArrowUpDown, Clock, Play, Pause, Calendar, User, FileText, MessageSquare } from 'lucide-react';
import CandidateDetails from './dashboard/CandidateDetails';
import type { CompletedCandidate, InProgressCandidate } from '@/store/slices/candidatesSlice';

const InterviewerTab = () => {
  const dispatch = useDispatch();
  const { completed, inProgress, searchTerm, sortBy, sortOrder } = useSelector((state: RootState) => state.candidates);
  const completedList = completed || [];
  const inProgressList = inProgress || [];
  const search = searchTerm || '';
  const sortKey = (sortBy as any) || 'score';
  const sortDir = (sortOrder as any) || 'desc';
  const [selectedCandidate, setSelectedCandidate] = useState<CompletedCandidate | null>(null);
  const [selectedInProgressCandidate, setSelectedInProgressCandidate] = useState<InProgressCandidate | null>(null);
  const [activeTab, setActiveTab] = useState('completed');

  // Filter and sort completed candidates
  const filteredCompletedCandidates = completedList
    .filter(candidate => 
      candidate.name.toLowerCase().includes(search.toLowerCase()) ||
      candidate.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'score':
          comparison = a.finalScore - b.finalScore;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'completedAt':
          comparison = a.completedAt - b.completedAt;
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

  // Filter and sort in-progress candidates
  const filteredInProgressCandidates = inProgressList
    .filter(candidate => 
      candidate.name.toLowerCase().includes(search.toLowerCase()) ||
      candidate.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lastActivityAt':
          comparison = a.lastActivityAt - b.lastActivityAt;
          break;
        case 'completedAt': // fallback to startedAt for in-progress
          comparison = a.startedAt - b.startedAt;
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getProgressPercentage = (candidate: InProgressCandidate) => {
    // Prefer real interview progress (answered questions) when available
    if (candidate.questions && candidate.questions.length > 0) {
      const answered = candidate.questions.filter(q => (q.answer || '').trim().length > 0).length;
      const total = Math.max(candidate.questions.length, 1);
      return (answered / total) * 100;
    }
    // If in interview stage but no questions/answers yet, show 0% for consistency
    if ((candidate as any).stage === 'interview') {
      return 0;
    }
    // Fallback to step-based progress before interview starts
    const steps = [
      candidate.progress.resumeUploaded,
      candidate.progress.infoCollected,
      candidate.progress.questionsGenerated,
      candidate.progress.interviewStarted
    ];
    const completedSteps = steps.filter(Boolean).length;
    return (completedSteps / steps.length) * 100;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-progress': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'draft': return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'in-progress': return 'default';
      case 'paused': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };


  if (selectedCandidate) {
    return (
      <CandidateDetails 
        candidate={selectedCandidate} 
        onBack={() => setSelectedCandidate(null)} 
      />
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-success text-success-foreground';
    if (score >= 60) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Candidates Information</h2>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Badge variant="secondary" className="text-sm sm:text-lg px-2 sm:px-3 py-1 border border-gray-800 dark:border-gray-600">
            {completedList.length} Completed
          </Badge>
          <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-3 py-1 border border-gray-800 dark:border-gray-600">
            {inProgressList.length} In Progress
          </Badge>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => dispatch(setSearchTerm(e.target.value))}
            className="pl-10 border border-gray-400 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Select value={sortBy} onValueChange={(value: any) => dispatch(setSortBy(value))}>
            <SelectTrigger className="w-32 sm:w-40 border border-gray-400 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Score</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="completedAt">Date</SelectItem>
              <SelectItem value="lastActivityAt">Last Activity</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="border border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-500"
            onClick={() => dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'))}
          >
            <ArrowUpDown className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            <span className="sm:hidden">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
          </Button>
        </div>
      </div>

      {/* Tabs for Completed and In Progress */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="completed" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Completed ({completedList.length})</span>
            <span className="sm:hidden">Completed ({completedList.length})</span>
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">In Progress ({inProgressList.length})</span>
            <span className="sm:hidden">In Progress ({inProgressList.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="completed" className="space-y-4">
          {/* Completed Candidates List */}
          {completedList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No completed interviews yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Candidates will appear here after completing their interviews
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCompletedCandidates.map((candidate) => (
                <Card 
                  key={`completed-${candidate.id}`} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{candidate.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      </div>
                      <Badge className={getScoreColor(candidate.finalScore)}>
                        {candidate.finalScore}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {candidate.finalSummary}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Completed: {new Date(candidate.completedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {/* In Progress Candidates List */}
          {inProgressList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No interviews in progress</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Active interview sessions will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredInProgressCandidates.map((candidate) => (
                <Card 
                  key={`inprogress-${candidate.interviewId}`} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-blue-500"
                  onClick={() => {
                    const event = new CustomEvent('resume-interview', { detail: candidate });
                    window.dispatchEvent(event);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <CardTitle className="text-lg">{candidate.name}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(candidate.status)} className="flex items-center space-x-1">
                            {getStatusIcon(candidate.status)}
                            <span className="capitalize">{candidate.status.replace('-', ' ')}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatTimeAgo(candidate.lastActivityAt)}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 min-h-[240px] flex flex-col">
                    <div className="space-y-10 flex-1">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{Math.round(getProgressPercentage(candidate))}%</span>
                        </div>
                        <Progress value={getProgressPercentage(candidate)} className="h-2" />
                      </div>

                      {/* Compact timeline (consistent with WelcomeBack) */}
                      {(() => {
                        const totalQ = candidate.questions?.length || 0;
                        const answeredQ = totalQ > 0 ? candidate.questions.filter(q => (q.answer || '').trim().length > 0).length : 0;
                        const steps = [
                          { done: !!candidate.progress.resumeUploaded, Icon: FileText, label: 'Resume' },
                          { done: !!candidate.progress.infoCollected, Icon: User, label: 'Info' },
                          { 
                            done: !!candidate.progress.questionsGenerated || totalQ > 0, 
                            Icon: MessageSquare, 
                            label: totalQ > 0 ? `${answeredQ}/${totalQ} questions` : (candidate.progress.questionsGenerated ? 'Questions Ready' : 'Questions')
                          },
                          { done: !!candidate.progress.interviewStarted, Icon: Play, label: 'Interview' },
                        ];
                        return (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {steps.map((s, idx) => (
                              <div key={`step-${idx}`} className="flex-1 min-w-[120px] flex items-center">
                                {idx > 0 && (
                                  <div className={`h-0.5 w-2 sm:w-4 md:w-6 ${steps[idx-1].done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                                )}
                                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-full border shadow-sm ${s.done ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${s.done ? 'bg-green-100 dark:bg-green-800/60' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    <s.Icon className={`h-3.5 w-3.5 ${s.done ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`} />
                                  </div>
                                  <span className="text-xs font-medium">{s.label}</span>
                                </div>
                                {idx < steps.length - 1 && (
                                  <div className={`h-0.5 w-2 sm:w-4 md:w-6 ${s.done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Interview Details */}
                      {candidate.questions.length > 0 && (
                        <div className="flex items-center justify-end text-sm">
                          <span className="text-muted-foreground">Started {formatTimeAgo(candidate.startedAt)}</span>
                        </div>
                      )}

                      {/* Action Button */}
                    </div>
                    <div className="mt-3">
                        <Button size="sm" className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          Resume Interview
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterviewerTab;
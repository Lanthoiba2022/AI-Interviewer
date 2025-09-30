import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setSearchTerm, setSortBy, setSortOrder } from '@/store/slices/candidatesSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown } from 'lucide-react';
import CandidateDetails from './dashboard/CandidateDetails';
import type { CompletedCandidate } from '@/store/slices/candidatesSlice';

const InterviewerTab = () => {
  const dispatch = useDispatch();
  const { completed, searchTerm, sortBy, sortOrder } = useSelector((state: RootState) => state.candidates);
  const [selectedCandidate, setSelectedCandidate] = useState<CompletedCandidate | null>(null);

  // Filter and sort candidates
  const filteredCandidates = completed
    .filter(candidate => 
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
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
      return sortOrder === 'asc' ? comparison : -comparison;
    });

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Candidate Dashboard</h2>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {completed.length} Candidates
        </Badge>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => dispatch(setSearchTerm(e.target.value))}
            className="pl-10"
          />
        </div>
        
        <Select value={sortBy} onValueChange={(value: any) => dispatch(setSortBy(value))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Score</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="completedAt">Date</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'))}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </div>

      {/* Candidates List */}
      {completed.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">No completed interviews yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Candidates will appear here after completing their interviews
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCandidates.map((candidate) => (
            <Card 
              key={candidate.id} 
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
    </div>
  );
};

export default InterviewerTab;
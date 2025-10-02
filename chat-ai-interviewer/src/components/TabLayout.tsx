import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { loadFromInProgress, resumeInterview, setStage } from '@/store/slices/interviewSlice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Users } from 'lucide-react';
import IntervieweeTab from './IntervieweeTab';
import InterviewerTab from './InterviewerTab';

const TabLayout = () => {
  const [activeTab, setActiveTab] = useState('interviewee');
  const dispatch = useDispatch();

  useEffect(() => {
    const handler = (e: any) => {
      const candidate = e.detail;
      dispatch(loadFromInProgress({
        interviewId: candidate.interviewId,
        currentCandidate: {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          resumeText: candidate.resumeText,
          resumeFileName: candidate.resumeFileName,
          resumeScore: candidate.resumeScore,
          resumeStrengths: candidate.resumeStrengths,
          resumeWeaknesses: candidate.resumeWeaknesses,
        },
        questions: candidate.questions,
        currentQuestionIndex: candidate.currentQuestionIndex,
        status: candidate.status,
        startedAt: candidate.startedAt,
        lastActivityAt: candidate.lastActivityAt,
        progress: candidate.progress,
        chatHistory: candidate.chatHistory,
        stage: candidate.stage,
      }));
      // Switch to Interviewee tab and ensure interview stage
      setActiveTab('interviewee');
      if (candidate.stage !== 'completed') {
        // Show Welcome Back screen first. Do not resume yet; let user choose to continue.
        dispatch(setStage('interview'));
      }
    };
    window.addEventListener('resume-interview', handler as any);
    return () => window.removeEventListener('resume-interview', handler as any);
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Crisp</h1>
              <span className="text-xs sm:text-sm text-muted-foreground">AI-Powered Interview Assistant</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8">
          <TabsTrigger value="interviewee" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Interviewee</span>
            <span className="sm:hidden">Interviewee</span>
          </TabsTrigger>
          <TabsTrigger value="interviewer" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Interviewer Dashboard</span>
            <span className="sm:hidden">Interviewer</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interviewee">
          <IntervieweeTab />
        </TabsContent>

        <TabsContent value="interviewer">
          <InterviewerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TabLayout;
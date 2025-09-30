import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Users } from 'lucide-react';
import IntervieweeTab from './IntervieweeTab';
import InterviewerTab from './InterviewerTab';

const TabLayout = () => {
  const [activeTab, setActiveTab] = useState('interviewee');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">Crisp</h1>
              <span className="text-sm text-muted-foreground">AI-Powered Interview Assistant</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="container mx-auto px-4 py-6">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="interviewee" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Interviewee</span>
          </TabsTrigger>
          <TabsTrigger value="interviewer" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Interviewer Dashboard</span>
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
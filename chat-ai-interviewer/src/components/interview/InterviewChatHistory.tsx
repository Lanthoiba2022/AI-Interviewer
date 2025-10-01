import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, Bot } from 'lucide-react';

const InterviewChatHistory = () => {
  const { chatHistory, currentCandidate, resumeAnalysis } = useSelector((state: RootState) => state.interview);

  if (!chatHistory || chatHistory.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No chat history available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Interview Chat History</h2>
        <p className="text-muted-foreground">
          Complete conversation with {currentCandidate?.name}
        </p>
      </div>

      {/* Chat History */}
      <Card className="min-h-96">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Interview Conversation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          {resumeAnalysis?.summary && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-lg bg-gray-100 text-gray-900 mr-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Bot className="h-4 w-4" />
                  <Badge variant="outline" className="text-xs">AI Interviewer</Badge>
                  <span className="text-xs text-muted-foreground">Resume Summary</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {resumeAnalysis.summary}
                </div>
              </div>
            </div>
          )}
          {chatHistory.map((message, idx) => (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewChatHistory;

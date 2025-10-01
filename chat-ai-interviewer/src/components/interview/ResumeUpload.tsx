import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCandidate, setMissingFields, setStage, addChatMessage, startInterview, setResumeAnalysis, setResumeAnalysisComplete } from '@/store/slices/interviewSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, AlertCircle, Loader2, Brain, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { aiService } from '@/services/aiService';
import { RootState } from '@/store/store';

const ResumeUpload = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { currentCandidate, stage } = useSelector((state: RootState) => state.interview);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // For now, we'll use AI analysis directly instead of text extraction
    // In a real implementation, you'd use pdf-parse here
    return `PDF file: ${file.name}`;
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    // For now, we'll use AI analysis directly instead of text extraction
    // In a real implementation, you'd use mammoth here
    return `DOCX file: ${file.name}`;
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('document')) {
      // Delay toast to avoid popup blocker during file chooser
      setTimeout(() => {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOCX file.",
          variant: "destructive",
        });
      }, 100);
      return;
    }

    setIsProcessing(true);
    try {
      // Wait for Puter to be ready
      await aiService.waitForPuter();

      dispatch(addChatMessage({
        type: 'system',
        content: `Resume uploaded: ${file.name}. Analyzing with AI...`,
      }));

      // Use AI service to analyze resume
      const analysis = await aiService.analyzeResume(file);

      // Store the resume analysis in cache
      // Normalize resume score to 0-100 if model returned a 0-10 scale
      const normalizedAnalysis = {
        ...analysis,
        score: (typeof analysis.score === 'number' && analysis.score > 0 && analysis.score <= 10)
          ? Math.round(analysis.score * 10)
          : Math.round(analysis.score || 0)
      };

      dispatch(setResumeAnalysis(normalizedAnalysis));

      const candidateInfo = {
        name: analysis.name || '',
        email: analysis.email || '',
        phone: analysis.phone || '',
      };

      const missingFields = [];
      if (!candidateInfo.name) missingFields.push('name');
      if (!candidateInfo.email) missingFields.push('email');
      if (!candidateInfo.phone) missingFields.push('phone');

      const strengthsList = (normalizedAnalysis.strengths || []).map((s: string) => `- ${s}`).join('\n');
      const weaknessesList = (normalizedAnalysis.weaknesses || []).map((w: string) => `- ${w}`).join('\n');
      const detailedResumeSummary = [
        normalizedAnalysis.summary?.trim() || '',
        strengthsList ? `\n\nStrengths:\n${strengthsList}` : '',
        weaknessesList ? `\n\nAreas for improvement:\n${weaknessesList}` : '',
      ].join('');

      dispatch(setCandidate({
        id: Date.now().toString(),
        ...candidateInfo,
        resumeText: detailedResumeSummary || normalizedAnalysis.summary,
        resumeFileName: file.name,
        resumeScore: normalizedAnalysis.score,
        resumeStrengths: normalizedAnalysis.strengths,
        resumeWeaknesses: normalizedAnalysis.weaknesses,
      }));

      dispatch(addChatMessage({
        type: 'ai',
        content: `Resume analysis complete! I found ${normalizedAnalysis.strengths.length} key strengths and identified areas for improvement. Resume score: ${normalizedAnalysis.score}/100.`,
      }));

      // Add the detailed resume analysis summary to chat history
      dispatch(addChatMessage({
        type: 'ai',
        content: `Detailed Resume Analysis Summary:\n\n${normalizedAnalysis.summary}${strengthsList ? `\n\nStrengths:\n${strengthsList}` : ''}${weaknessesList ? `\n\nAreas for improvement:\n${weaknessesList}` : ''}`,
      }));

      if (missingFields.length > 0) {
        dispatch(setMissingFields(missingFields));
        dispatch(setStage('collecting-info'));
        dispatch(addChatMessage({
          type: 'ai',
          content: `I couldn't confidently extract ${missingFields.join(', ')} from your resume. Please provide them to continue.`,
        }));
      } else {
        // Mark analysis as complete and start the interview
        dispatch(setResumeAnalysisComplete(true));
        dispatch(setStage('interview'));
        dispatch(addChatMessage({
          type: 'ai',
          content: `Perfect! I have all your information. Let's begin your interview for the Full Stack Developer position. I'll generate personalized questions based on your resume and we'll start with the first question.`,
        }));
      }

      // Delay toast to avoid popup blocker during file chooser
      setTimeout(() => {
        toast({
          title: "Resume analyzed successfully",
          description: `AI analysis complete. Score: ${normalizedAnalysis.score}/100`,
        });
      }, 100);
    } catch (error) {
      console.error('Resume analysis error:', error);
      
      // Handle missing fields error (analysis worked but missing some fields)
      if (error instanceof Error && (error as any).missingFields) {
        const missingFields = (error as any).missingFields;
        dispatch(setMissingFields(missingFields));
        dispatch(setStage('collecting-info'));
        dispatch(addChatMessage({
          type: 'ai',
          content: `I couldn't extract ${missingFields.join(', ')} from your resume. Please provide them to continue.`,
        }));
        
        // No toast for missing fields - just redirect to manual entry
        return;
      }
      
      // Handle "Resume Extraction is down" error (complete analysis failure)
      if (error instanceof Error && error.message.includes('Resume Extraction is down')) {
        // Delay toast to avoid popup blocker during file chooser
        setTimeout(() => {
          toast({
            title: "Resume Extraction is down. Proceed manually",
            description: "Please enter your information manually to continue.",
            variant: "destructive",
          });
        }, 100);
        
        // Set stage to collecting-info for manual entry
        dispatch(setMissingFields(['name', 'email', 'phone']));
        dispatch(setStage('collecting-info'));
        dispatch(addChatMessage({
          type: 'ai',
          content: `Resume analysis is currently unavailable. Please provide your name, email, and phone number to continue.`,
        }));
        return;
      }
      
      // Handle other errors
      let errorMessage = "Failed to analyze the resume. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to analyze resume')) {
          errorMessage = "AI analysis failed. Please ensure your resume is readable and try again.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      // Delay toast to avoid popup blocker during file chooser
      setTimeout(() => {
        toast({
          title: "Analysis failed",
          description: errorMessage,
          variant: "destructive",
        });
      }, 100);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Small delay to avoid popup blocker during drag and drop
      setTimeout(() => {
        handleFileUpload(e.dataTransfer.files[0]);
      }, 50);
    }
  };

  const handleStartInterview = () => {
    dispatch(startInterview());
    dispatch(addChatMessage({
      type: 'ai',
      content: `Great! Let's begin your interview. I'll generate personalized questions based on your resume and we'll start with the first question.`,
    }));
  };

  // Show resume analysis results if available
  if (currentCandidate && stage === 'interview') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Resume Analysis Complete!</h2>
          <p className="text-muted-foreground text-lg">
            Ready to start your AI-powered interview
          </p>
        </div>

        <Card className="bg-accent/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Analysis Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg">{currentCandidate.name || 'Not found'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg">{currentCandidate.email || 'Not found'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-lg">{currentCandidate.phone || 'Not found'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resume Score</p>
                <p className="text-lg font-bold text-primary">{currentCandidate.resumeScore}/100</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Key Strengths</p>
              <div className="flex flex-wrap gap-2">
                {currentCandidate.resumeStrengths?.map((strength, index) => (
                  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {strength}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Areas for Improvement</p>
              <div className="flex flex-wrap gap-2">
                {currentCandidate.resumeWeaknesses?.map((weakness, index) => (
                  <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    {weakness}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <h3 className="text-xl font-semibold">Ready to Begin Your Interview?</h3>
            <p className="text-muted-foreground">
              I'll generate 6 personalized questions based on your resume. The interview will include:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 2 Easy questions (20 seconds each)</li>
              <li>• 2 Medium questions (60 seconds each)</li>
              <li>• 2 Hard questions (120 seconds each)</li>
              <li>• Voice input support with real-time transcription</li>
              <li>• AI-powered evaluation and feedback</li>
            </ul>
            
            <Button 
              onClick={handleStartInterview}
              size="lg"
              className="w-full"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Welcome to Crisp</h2>
        <p className="text-muted-foreground text-lg">
          AI-Powered Interview Assistant for Full Stack Developers
        </p>
      </div>

      <Card className="border-2 border-dashed border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Upload Your Resume</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Drop your resume here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supports PDF and DOCX files (max 10MB)
            </p>
            
            <Input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  // Small delay to avoid popup blocker during file chooser
                  setTimeout(() => {
                    handleFileUpload(e.target.files![0]);
                  }, 50);
                }
              }}
              className="hidden"
              id="resume-upload"
              disabled={isProcessing}
            />
            
            <Button 
              asChild 
              disabled={isProcessing}
              className="min-w-32"
            >
              <label htmlFor="resume-upload" className="cursor-pointer">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Choose File
                  </>
                )}
              </label>
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-accent/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-accent-foreground mt-0.5" />
              <div className="text-sm text-accent-foreground">
                <p className="font-medium">What happens next:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• We'll extract your name, email, and phone number</li>
                  <li>• Ask for any missing information</li>
                  <li>• Start your AI-powered interview (6 questions total)</li>
                  <li>• Provide real-time scoring and feedback</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumeUpload;
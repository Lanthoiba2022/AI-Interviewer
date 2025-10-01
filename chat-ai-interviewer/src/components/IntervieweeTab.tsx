import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import ResumeUpload from './interview/ResumeUpload';
import InfoCollection from './interview/InfoCollection';
import InterviewChat from './interview/InterviewChat';
import InterviewComplete from './interview/InterviewComplete';
import WelcomeBack from './interview/WelcomeBack';

const IntervieweeTab = () => {
  const { stage, currentCandidate, isInterviewActive, missingFields } = useSelector((state: RootState) => state.interview);

  // If collecting-info, take user straight to info collection (do not show WelcomeBack)
  if (stage === 'collecting-info') {
    return <InfoCollection />;
  }

  // Show welcome back modal only for paused interview stage
  if (currentCandidate && stage === 'interview' && !isInterviewActive) {
    return <WelcomeBack />;
  }

  switch (stage) {
    case 'upload':
      return <ResumeUpload />;
    case 'interview':
      return <InterviewChat />;
    case 'completed':
      return <InterviewComplete />;
    default:
      return <ResumeUpload />;
  }
};

export default IntervieweeTab;
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import ResumeUpload from './interview/ResumeUpload';
import InfoCollection from './interview/InfoCollection';
import InterviewChat from './interview/InterviewChat';
import InterviewComplete from './interview/InterviewComplete';
import WelcomeBack from './interview/WelcomeBack';

const IntervieweeTab = () => {
  const { stage, currentCandidate, isInterviewActive } = useSelector((state: RootState) => state.interview);

  // Show welcome back modal if there's an existing session but interview is not active
  if (currentCandidate && stage !== 'completed' && !isInterviewActive) {
    return <WelcomeBack />;
  }

  switch (stage) {
    case 'upload':
      return <ResumeUpload />;
    case 'collecting-info':
      return <InfoCollection />;
    case 'interview':
      return <InterviewChat />;
    case 'completed':
      return <InterviewComplete />;
    default:
      return <ResumeUpload />;
  }
};

export default IntervieweeTab;
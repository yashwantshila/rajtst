import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import MegaTestLeaderboard from '../components/MegaTestLeaderboard';

const LeaderboardPage = () => {
  const { megaTestId } = useParams();
  const navigate = useNavigate();

  if (!megaTestId) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <MegaTestLeaderboard megaTestId={megaTestId} standalone={true} />
    </div>
  );
};

export default LeaderboardPage; 
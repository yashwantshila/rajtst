import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Trophy } from 'lucide-react';

interface MegaTestPrizesProps {
  megaTestId: string;
}

const MegaTestPrizes = ({ megaTestId }: MegaTestPrizesProps) => {
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => navigate(`/mega-test/${megaTestId}/prizes`)}
    >
      <Trophy className="h-4 w-4 mr-2 text-amber-500" />
      View Prizes
    </Button>
  );
};

export default MegaTestPrizes; 
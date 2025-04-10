import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getMegaTestPrizes } from '@/services/firebase/quiz';

interface MegaTestPrizesProps {
  megaTestId: string;
}

const MegaTestPrizes = ({ megaTestId }: MegaTestPrizesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: prizes, isLoading } = useQuery({
    queryKey: ['mega-test-prizes', megaTestId],
    queryFn: () => getMegaTestPrizes(megaTestId),
  });

  if (isLoading || !prizes || prizes.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-base">
            <Trophy className="h-4 w-4 mr-2 text-amber-500" />
            Prizes
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-3">
            {prizes.map((prize, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-slate-100 text-slate-600' :
                  index === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {prize.rank}
                </div>
                <span className="text-sm">{prize.prize}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MegaTestPrizes; 
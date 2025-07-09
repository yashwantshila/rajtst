import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from 'lucide-react';
import { getMegaTestById, getMegaTestPrizes } from '@/services/api/megaTest';

const MegaTestPrizesPage = () => {
  const { megaTestId } = useParams();
  const navigate = useNavigate();

  const { data: megaTest, isLoading: isLoadingMegaTest } = useQuery({
    queryKey: ['mega-test', megaTestId],
    queryFn: () => getMegaTestById(megaTestId!),
    enabled: !!megaTestId
  });

  const { data: prizes, isLoading: isLoadingPrizes } = useQuery({
    queryKey: ['mega-test-prizes', megaTestId],
    queryFn: () => getMegaTestPrizes(megaTestId!),
    enabled: !!megaTestId
  });

  if (isLoadingMegaTest || isLoadingPrizes) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!megaTest || !prizes) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Mega test not found</p>
      </div>
    );
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

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              {megaTest.title} - Prizes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prizes.map((prize, index) => (
                <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                    prize.rank === 1 ? 'bg-amber-100 text-amber-600' :
                    prize.rank === 2 ? 'bg-slate-100 text-slate-600' :
                    prize.rank === 3 ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {prize.rank}
                  </div>
                  <div className="text-lg font-medium">{prize.prize}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MegaTestPrizesPage; 
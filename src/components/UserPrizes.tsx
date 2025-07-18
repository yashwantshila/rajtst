import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from 'lucide-react';
import { getUserPrizes, UserPrize } from '../services/api/megaTest';

interface UserPrizesProps {
  userId: string;
}


const UserPrizes = ({ userId }: UserPrizesProps) => {

  const { data: prizes, isLoading, refetch } = useQuery({
    queryKey: ['user-prizes', userId],
    queryFn: () => getUserPrizes(userId),
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Prizes Won
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prizes || prizes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Prizes Won
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No prizes won yet. Participate in mega tests to win prizes!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Prizes Won
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {prizes.map((prize, index) => (
            <div key={index} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                  prize.rank === 1 ? 'bg-amber-100 text-amber-600' :
                  prize.rank === 2 ? 'bg-slate-100 text-slate-600' :
                  prize.rank === 3 ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {prize.rank}
                </div>
                <div>
                  <div className="font-medium">{prize.megaTestTitle}</div>
                  <div className="text-sm text-muted-foreground">{prize.prize}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-green-600">
                Credited to Balance
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserPrizes; 
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Gift } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { MegaTestPrize } from '../services/firebase/quiz';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PrizeClaimForm from './PrizeClaimForm';

interface UserPrizesProps {
  userId: string;
}

const UserPrizes = ({ userId }: UserPrizesProps) => {
  const [selectedPrize, setSelectedPrize] = useState<{
    megaTestId: string;
    prize: string;
    rank: number;
  } | null>(null);

  const { data: prizes, isLoading, refetch } = useQuery({
    queryKey: ['user-prizes', userId],
    queryFn: async () => {
      // Get all mega tests
      const megaTestsRef = collection(db, 'mega-tests');
      const megaTestsSnapshot = await getDocs(megaTestsRef);
      
      const userPrizes: Array<{
        megaTestId: string;
        megaTestTitle: string;
        prize: string;
        rank: number;
        claimed: boolean;
      }> = [];
      
      const now = Timestamp.now();
      
      // For each mega test, check if user is in leaderboard and get their rank
      for (const megaTestDoc of megaTestsSnapshot.docs) {
        const megaTestId = megaTestDoc.id;
        const megaTest = megaTestDoc.data();
        
        // Only process mega tests where result time has been reached
        if (megaTest.resultTime.toMillis() > now.toMillis()) {
          continue;
        }
        
        // Get user's leaderboard entry
        const leaderboardRef = collection(db, 'mega-tests', megaTestId, 'leaderboard');
        const leaderboardQuery = query(leaderboardRef, where('userId', '==', userId));
        const leaderboardSnapshot = await getDocs(leaderboardQuery);
        
        if (!leaderboardSnapshot.empty) {
          const userEntry = leaderboardSnapshot.docs[0].data();
          const rank = userEntry.rank;
          
          // Get prizes for this mega test
          const prizesRef = collection(db, 'mega-tests', megaTestId, 'prizes');
          const prizesSnapshot = await getDocs(prizesRef);
          const prizes = prizesSnapshot.docs.map(doc => doc.data() as MegaTestPrize);
          
          // Find the prize for user's rank
          const prize = prizes.find(p => p.rank === rank);
          if (prize) {
            // Check if prize has been claimed
            const claimsRef = collection(db, 'mega-tests', megaTestId, 'prize-claims');
            const claimsQuery = query(claimsRef, where('rank', '==', rank));
            const claimsSnapshot = await getDocs(claimsQuery);
            const claimed = !claimsSnapshot.empty;

            userPrizes.push({
              megaTestId,
              megaTestTitle: megaTest.title,
              prize: prize.prize,
              rank: prize.rank,
              claimed
            });
          }
        }
      }
      
      return userPrizes;
    },
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
              {!prize.claimed && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPrize({
                        megaTestId: prize.megaTestId,
                        prize: prize.prize,
                        rank: prize.rank
                      })}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Claim Prize
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Claim Your Prize</DialogTitle>
                    </DialogHeader>
                    {selectedPrize && (
                      <PrizeClaimForm
                        megaTestId={selectedPrize.megaTestId}
                        prize={selectedPrize.prize}
                        rank={selectedPrize.rank}
                        onSuccess={() => {
                          refetch();
                          setSelectedPrize(null);
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              )}
              {prize.claimed && (
                <div className="text-sm text-green-600 font-medium">
                  Prize Claimed
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserPrizes; 
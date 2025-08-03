import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDailyTopRankers, DailyRankEntry } from '@/services/api/dailyChallenge';
import { getUserProfile } from '@/services/api/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Seo from '@/components/Seo';

interface RankEntry extends DailyRankEntry {
  userName: string;
}

const DailyTopRankers = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<DailyRankEntry[]>({
    queryKey: ['daily-top-rankers'],
    queryFn: getDailyTopRankers,
  });

  const [entries, setEntries] = useState<RankEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!data) return;
      const withNames = await Promise.all(
        data.map(async (e) => {
          try {
            const profile = await getUserProfile(e.userId);
            return { ...e, userName: profile?.username || 'Anonymous' };
          } catch {
            return { ...e, userName: 'Anonymous' };
          }
        })
      );
      setEntries(withNames);
    };
    load();
  }, [data]);

  if (isLoading || (data && data.length > 0 && entries.length === 0)) {
    return (
      <>
        <Seo />
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner className="h-8 w-8 text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Seo />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Daily Top Rankers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-4 text-right">{idx + 1}.</span>
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{entry.userName}</span>
                  </div>
                  <span className="font-medium">
                    ₹{entry.totalPrize.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              {entries.length === 0 && (
                <div className="text-center text-muted-foreground">No rankings yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default DailyTopRankers;

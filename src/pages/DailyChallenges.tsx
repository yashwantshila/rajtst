import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getDailyChallenges,
  startChallenge,
  DailyChallenge,
  getChallengeStatus,
} from '@/services/api/dailyChallenge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ListChecks, Clock } from 'lucide-react';
import { useAuth } from '@/App';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';

const DailyChallenges = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: challenges, refetch, isLoading } = useQuery({
    queryKey: ['daily-challenges'],
    queryFn: getDailyChallenges,
  });

  const [played, setPlayed] = useState<Record<string, boolean>>({});

  const startMutation = useMutation({
    mutationFn: (id: string) => startChallenge(id),
    onSuccess: (_data, id) => {
      toast.success('Challenge started');
      navigate(`/daily-challenges/${id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to start');
    },
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!user || !challenges) return;
      const results = await Promise.all(
        challenges.map(ch =>
          getChallengeStatus(ch.id).then(status => status.started),
        ),
      );
      const map: Record<string, boolean> = {};
      challenges.forEach((ch, idx) => {
        map[ch.id] = results[idx];
      });
      setPlayed(map);
    };
    fetchStatuses();
  }, [user, challenges]);

  const handleStart = async (challenge: DailyChallenge) => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    try {
      const status = await getChallengeStatus(challenge.id);
      if (!status.started) {
        await startMutation.mutateAsync(challenge.id);
        setPlayed(prev => ({ ...prev, [challenge.id]: true }));
      } else {
        navigate(`/daily-challenges/${challenge.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error starting');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
        Daily Challenges
      </h1>
      <div className="grid gap-4">
        {challenges?.map(ch => (
          <Card
            key={ch.id}
            className="relative overflow-hidden border-2 border-purple-200 hover:border-purple-400 bg-gradient-to-br from-white via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 transition-all duration-300 hover:shadow-xl"
          >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-purple-700 dark:text-purple-400">
              {ch.title}
            </CardTitle>
            {ch.description && (
              <p className="text-sm text-muted-foreground mt-1">{ch.description}</p>
            )}
          </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p className="flex items-center">
                  <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                  Reward: ₹{ch.reward}
                </p>
                <p className="flex items-center">
                  <ListChecks className="h-4 w-4 text-green-500 mr-1" />
                  Required Correct: {ch.requiredCorrect}
                </p>
                <p className="flex items-center">
                  <Clock className="h-4 w-4 text-blue-500 mr-1" />
                  Time Limit: {ch.timeLimit}s
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {ch.practiceUrl && (
                  <Button
                    asChild
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                  >
                    <a href={ch.practiceUrl} target="_blank" rel="noopener noreferrer">Practice</a>
                  </Button>
                )}
                <Button
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                  onClick={() => handleStart(ch)}
                >
                  {played[ch.id] ? 'View Result' : 'Start'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {challenges && challenges.length === 0 && (
          <p>No challenges available.</p>
        )}
      </div>
      <div className="mt-4">
        <Link to="/">← Back to Home</Link>
      </div>
    </div>
  );
};

export default DailyChallenges;

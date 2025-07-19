import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getDailyChallenges, startChallenge, DailyChallenge, getChallengeStatus } from '@/services/api/dailyChallenge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/App';
import { toast } from 'sonner';

const DailyChallenges = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: challenges, refetch } = useQuery({
    queryKey: ['daily-challenges'],
    queryFn: getDailyChallenges,
  });

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

  const handleStart = async (challenge: DailyChallenge) => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    try {
      const status = await getChallengeStatus(challenge.id).catch(() => null);
      if (!status) {
        await startMutation.mutateAsync(challenge.id);
      } else {
        navigate(`/daily-challenges/${challenge.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error starting');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Daily Challenges</h1>
      <div className="grid gap-4">
        {challenges?.map(ch => (
          <Card key={ch.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>{ch.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reward: ₹{ch.reward}</p>
                <p className="text-sm text-muted-foreground">Required Correct: {ch.requiredCorrect}</p>
                <p className="text-sm text-muted-foreground">Time Limit: {ch.timeLimit}s</p>
              </div>
              <Button onClick={() => handleStart(ch)}>Start</Button>
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

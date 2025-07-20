import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  getChallengeStatus,
  getNextQuestion,
  submitAnswer,
  ChallengeQuestion,
} from '@/services/api/dailyChallenge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DailyChallengePlay = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const [status, setStatus] = useState<any>(null);
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const fetchNext = async () => {
    if (!challengeId) return;
    try {
      const q = await getNextQuestion(challengeId);
      setQuestion(q);
      setSelectedIndex(null);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to get question');
    }
  };

  useEffect(() => {
    if (!challengeId) return;
    const loadStatusAndQuestion = async () => {
      try {
        const statusData = await getChallengeStatus(challengeId);
        setStatus(statusData);
        if (!statusData.completed) {
          await fetchNext();
        }
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to load');
      }
    };
    loadStatusAndQuestion();
  }, [challengeId]);

  useEffect(() => {
    if (!status) return;
    const end = new Date(status.startedAt).getTime() + (status.timeLimit || 0) * 1000;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (timeLeft === 0 && status && !status.completed && challengeId) {
      getChallengeStatus(challengeId)
        .then(d => setStatus(d))
        .catch(() => {});
    }
  }, [timeLeft, status, challengeId]);

  const submitMutation = useMutation({
    mutationFn: (answer: string) => submitAnswer(challengeId!, question!.id, answer),
    onSuccess: data => {
      // merge with existing status so startedAt is preserved for timer
      setStatus(prev => ({
        ...(prev || {}),
        ...data,
      }));
      if (data.completed) {
        toast.success(data.won ? 'You won!' : 'Challenge over');
      } else {
        fetchNext();
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed');
    },
  });

  if (!challengeId) return <p>Invalid challenge</p>;

  if (status && status.completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8">
        <div className="container max-w-xl mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Challenge Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-lg">Correct: {status.correctCount}</p>
              <p className="font-semibold">{status.won ? 'You won!' : 'Better luck next time.'}</p>
              <Button asChild className="mt-2">
                <Link to="/daily-challenges">Back to Challenges</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8">
      <div className="container max-w-xl mx-auto px-4">
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container max-w-xl mx-auto px-4">
            <div className="flex justify-between items-center py-2">
              <Button asChild variant="ghost" className="hover:bg-background/60 px-2">
                <Link to="/daily-challenges">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-1.5">
                <div className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                  Correct: {status?.correctCount || 0}
                </div>
                <div className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                  {timeLeft ?? ''}s
                </div>
              </div>
            </div>
            {timeLeft !== null && (
              <div className="mb-2">
                <Progress value={(timeLeft / status.timeLimit) * 100} className="h-1" />
              </div>
            )}
          </div>
        </div>

        <div className="pt-[60px]">
          {question ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl whitespace-pre-wrap">{question.text}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {question.options
                    .filter(opt => opt && opt.trim())
                    .slice(0, 4)
                    .map((opt, idx) => (
                      <Button
                        key={idx}
                        variant={selectedIndex === idx ? 'default' : 'outline'}
                        className="w-full justify-start h-auto py-4 px-4 text-left"
                        onClick={() => setSelectedIndex(idx)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-[1.5rem] h-6 flex items-center justify-center rounded-full bg-muted text-sm mt-1">
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="whitespace-pre-wrap text-left">{opt}</span>
                        </div>
                      </Button>
                    ))}
                </div>
                <Button
                  className="w-full"
                  disabled={selectedIndex === null || submitMutation.isPending || timeLeft === 0}
                  onClick={() =>
                    selectedIndex !== null &&
                    submitMutation.mutate(question.options[selectedIndex])
                  }
                >
                  Submit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyChallengePlay;

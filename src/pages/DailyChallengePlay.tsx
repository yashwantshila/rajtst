import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { getChallengeStatus, getNextQuestion, submitAnswer, ChallengeQuestion } from '@/services/api/dailyChallenge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
      <div className="container mx-auto p-4 max-w-xl text-center">
        <h1 className="text-2xl font-bold mb-4">Challenge Result</h1>
        <p className="mb-2">Correct: {status.correctCount}</p>
        <p className="mb-6 font-semibold">{status.won ? 'You won!' : 'Better luck next time.'}</p>
        <Link to="/daily-challenges" className="text-blue-500">Back to Challenges</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-xl">
      {question ? (
        <Card>
          <CardHeader>
            <CardTitle>{question.text}</CardTitle>
          </CardHeader>
          <CardContent>
            {timeLeft !== null && (
              <div className="w-full bg-gray-200 h-2 rounded mb-2 overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(timeLeft / status.timeLimit) * 100}%` }}
                />
              </div>
            )}
            <RadioGroup
              value={selectedIndex !== null ? String(selectedIndex) : ''}
              onValueChange={(val) => setSelectedIndex(Number(val))}
              className="space-y-2"
            >
              {question.options
                .filter(opt => opt && opt.trim())
                .slice(0, 4)
                .map((opt, idx) => {
                  const optionId = `${question.id}-${idx}`;
                  return (
                    <div key={optionId} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(idx)} id={optionId} />
                      <Label htmlFor={optionId}>{opt}</Label>
                    </div>
                  );
                })}
            </RadioGroup>
            <Button
              className="mt-4"
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
        <p>Loading...</p>
      )}
      <div className="mt-4 text-sm text-muted-foreground flex justify-between">
        <span>Correct: {status?.correctCount || 0}</span>
        <span>Time Left: {timeLeft ?? ''}s</span>
      </div>
      <div className="mt-4">
        <Link to="/daily-challenges" className="text-blue-500">Back to Challenges</Link>
      </div>
    </div>
  );
};

export default DailyChallengePlay;

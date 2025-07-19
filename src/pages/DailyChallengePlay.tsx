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
  const [selected, setSelected] = useState('');

  const fetchNext = async () => {
    if (!challengeId) return;
    try {
      const q = await getNextQuestion(challengeId);
      setQuestion(q);
      setSelected('');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to get question');
    }
  };

  useEffect(() => {
    if (!challengeId) return;
    getChallengeStatus(challengeId)
      .then(setStatus)
      .then(() => fetchNext())
      .catch(err => toast.error(err.response?.data?.error || 'Failed to load'));
  }, [challengeId]);

  const submitMutation = useMutation({
    mutationFn: (answer: string) => submitAnswer(challengeId!, question!.id, answer),
    onSuccess: data => {
      setStatus(data);
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
        <p className="mb-2">Attempts: {status.attemptCount}</p>
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
            <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2">
              {question.options.map(opt => (
                <div key={opt} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={opt} />
                  <Label htmlFor={opt}>{opt}</Label>
                </div>
              ))}
            </RadioGroup>
            <Button className="mt-4" disabled={!selected || submitMutation.isPending} onClick={() => submitMutation.mutate(selected)}>
              Submit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p>Loading...</p>
      )}
      <div className="mt-4 text-sm text-muted-foreground">
        Correct: {status?.correctCount || 0} / Attempts: {status?.attemptCount || 0}
      </div>
      <div className="mt-4">
        <Link to="/daily-challenges" className="text-blue-500">Back to Challenges</Link>
      </div>
    </div>
  );
};

export default DailyChallengePlay;

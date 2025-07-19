import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCreateChallenge, adminAddQuestion, getDailyChallenges } from '@/services/api/dailyChallenge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SanitizedInput } from '@/components/ui/sanitized-input';
import { SanitizedTextarea } from '@/components/ui/sanitized-textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const DailyChallengeManager = () => {
  const queryClient = useQueryClient();
  const { data: challenges } = useQuery({
    queryKey: ['daily-challenges-admin'],
    queryFn: getDailyChallenges,
  });

  const createMutation = useMutation({
    mutationFn: ({ title, reward, requiredCorrect }: { title: string; reward: number; requiredCorrect: number }) =>
      adminCreateChallenge(title, reward, requiredCorrect),
    onSuccess: () => {
      toast.success('Challenge created');
      queryClient.invalidateQueries({ queryKey: ['daily-challenges-admin'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const questionMutation = useMutation({
    mutationFn: ({ cid, text, options, correct }: { cid: string; text: string; options: string[]; correct: string }) =>
      adminAddQuestion(cid, text, options, correct),
    onSuccess: () => {
      toast.success('Question added');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const [createForm, setCreateForm] = useState({ title: '', reward: '', requiredCorrect: '' });
  const [questionForm, setQuestionForm] = useState({ text: '', a: '', b: '', c: '', d: '', correct: 'a' });
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Create Challenge</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Challenge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <SanitizedInput value={createForm.title} onChange={v => setCreateForm(f => ({ ...f, title: v }))} />
            </div>
            <div>
              <Label>Reward</Label>
              <SanitizedInput value={createForm.reward} onChange={v => setCreateForm(f => ({ ...f, reward: v }))} type="number" />
            </div>
            <div>
              <Label>Required Correct</Label>
              <SanitizedInput value={createForm.requiredCorrect} onChange={v => setCreateForm(f => ({ ...f, requiredCorrect: v }))} type="number" />
            </div>
            <Button onClick={() => createMutation.mutate({ title: createForm.title, reward: Number(createForm.reward), requiredCorrect: Number(createForm.requiredCorrect) })}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <h2 className="text-xl font-semibold">Existing Challenges</h2>
      <div className="grid gap-4">
        {challenges?.map(ch => (
          <Card key={ch.id}>
            <CardHeader>
              <CardTitle>{ch.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">Reward: ₹{ch.reward}</p>
              <Button size="sm" onClick={() => setActiveChallenge(ch.id)}>Add Question</Button>
            </CardContent>
          </Card>
        ))}
        {challenges && challenges.length === 0 && <p>No challenges</p>}
      </div>

      <Dialog open={!!activeChallenge} onOpenChange={() => setActiveChallenge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question Text</Label>
              <SanitizedTextarea value={questionForm.text} onChange={v => setQuestionForm(f => ({ ...f, text: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SanitizedInput placeholder="Option A" value={questionForm.a} onChange={v => setQuestionForm(f => ({ ...f, a: v }))} />
              <SanitizedInput placeholder="Option B" value={questionForm.b} onChange={v => setQuestionForm(f => ({ ...f, b: v }))} />
              <SanitizedInput placeholder="Option C" value={questionForm.c} onChange={v => setQuestionForm(f => ({ ...f, c: v }))} />
              <SanitizedInput placeholder="Option D" value={questionForm.d} onChange={v => setQuestionForm(f => ({ ...f, d: v }))} />
            </div>
            <div>
              <Label>Correct Option</Label>
              <SanitizedInput value={questionForm.correct} onChange={v => setQuestionForm(f => ({ ...f, correct: v }))} />
            </div>
            <Button onClick={() => {
              if (!activeChallenge) return;
              questionMutation.mutate({
                cid: activeChallenge,
                text: questionForm.text,
                options: [questionForm.a, questionForm.b, questionForm.c, questionForm.d],
                correct: questionForm.correct,
              });
              setQuestionForm({ text: '', a: '', b: '', c: '', d: '', correct: 'a' });
            }}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyChallengeManager;

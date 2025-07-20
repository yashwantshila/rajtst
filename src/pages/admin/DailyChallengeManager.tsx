import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminCreateChallenge,
  adminAddQuestion,
  adminAddBulkQuestions,
  adminGetQuestions,
  adminDeleteChallenge,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminGetQuestionCount,
  getDailyChallenges,
} from '@/services/api/dailyChallenge';
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
    mutationFn: ({ title, reward, requiredCorrect, timeLimit, description, practiceUrl }: { title: string; reward: number; requiredCorrect: number; timeLimit: number; description?: string; practiceUrl?: string }) =>
      adminCreateChallenge(title, reward, requiredCorrect, timeLimit, description, practiceUrl),
    onSuccess: () => {
      toast.success('Challenge created');
      queryClient.invalidateQueries({ queryKey: ['daily-challenges-admin'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const [createForm, setCreateForm] = useState({ title: '', description: '', practiceUrl: '', reward: '', requiredCorrect: '', timeLimit: '' });
  const [questionForm, setQuestionForm] = useState({ text: '', a: '', b: '', c: '', d: '', correct: 'a' });
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);
  const [bulkChallenge, setBulkChallenge] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [viewChallenge, setViewChallenge] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState<{ id: string; text: string; options: string[]; correctAnswer: string } | null>(null);

  const questionMutation = useMutation({
    mutationFn: ({ cid, text, options, correct }: { cid: string; text: string; options: string[]; correct: string }) =>
      adminAddQuestion(cid, text, options, correct),
    onSuccess: () => {
      toast.success('Question added');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ cid, questions }: { cid: string; questions: { text: string; options: string[]; correctAnswer: string }[] }) =>
      adminAddBulkQuestions(cid, questions),
    onSuccess: () => {
      toast.success('Questions added');
      setBulkText('');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const { data: questionList, refetch: refetchQuestions } = useQuery({
    queryKey: ['challenge-questions', viewChallenge],
    queryFn: () => adminGetQuestions(viewChallenge!),
    enabled: !!viewChallenge,
  });

  const ChallengeCard = ({ ch }: { ch: any }) => {
    const { data: count } = useQuery({
      queryKey: ['challenge-count', ch.id],
      queryFn: () => adminGetQuestionCount(ch.id),
    });
    const deleteMut = useMutation({
      mutationFn: () => adminDeleteChallenge(ch.id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily-challenges-admin'] }),
      onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle>{ch.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ch.description && <p className="text-sm text-muted-foreground">{ch.description}</p>}
          <p className="text-sm">Reward: ₹{ch.reward}</p>
          <p className="text-sm">Questions: {count ?? '...'}/{ch.requiredCorrect}</p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => setActiveChallenge(ch.id)}>Add Question</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkChallenge(ch.id)}>Bulk Add</Button>
            <Button size="sm" variant="secondary" onClick={() => setViewChallenge(ch.id)}>View MCQs</Button>
            <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate()}>Delete</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

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
              <Label>Description</Label>
              <SanitizedTextarea value={createForm.description} onChange={v => setCreateForm(f => ({ ...f, description: v }))} />
            </div>
            <div>
              <Label>Practice URL</Label>
              <SanitizedInput value={createForm.practiceUrl} onChange={v => setCreateForm(f => ({ ...f, practiceUrl: v }))} />
            </div>
            <div>
              <Label>Reward</Label>
              <SanitizedInput value={createForm.reward} onChange={v => setCreateForm(f => ({ ...f, reward: v }))} type="number" />
            </div>
            <div>
              <Label>Required Correct</Label>
              <SanitizedInput value={createForm.requiredCorrect} onChange={v => setCreateForm(f => ({ ...f, requiredCorrect: v }))} type="number" />
            </div>
            <div>
              <Label>Time Limit (seconds)</Label>
              <SanitizedInput value={createForm.timeLimit} onChange={v => setCreateForm(f => ({ ...f, timeLimit: v }))} type="number" />
            </div>
            <Button onClick={() => createMutation.mutate({ title: createForm.title, reward: Number(createForm.reward), requiredCorrect: Number(createForm.requiredCorrect), timeLimit: Number(createForm.timeLimit), description: createForm.description, practiceUrl: createForm.practiceUrl })}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <h2 className="text-xl font-semibold">Existing Challenges</h2>
      <div className="grid gap-4">
        {challenges?.map(ch => (
          <ChallengeCard key={ch.id} ch={ch} />
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

      <Dialog open={!!bulkChallenge} onOpenChange={() => setBulkChallenge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Add Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paste questions (one per line, format: text | a | b | c | d | correctOption)</Label>
              <SanitizedTextarea value={bulkText} onChange={v => setBulkText(v)} className="min-h-[150px]" />
            </div>
            <Button onClick={() => {
              if (!bulkChallenge) return;
              const questions = bulkText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length < 6) return null;
                const [text, a, b, c, d, correct] = parts;
                return { text, options: [a, b, c, d], correctAnswer: correct };
              }).filter(Boolean) as { text: string; options: string[]; correctAnswer: string }[];
              if (questions.length === 0) { toast.error('No valid questions'); return; }
              bulkMutation.mutate({ cid: bulkChallenge, questions });
            }}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewChallenge} onOpenChange={() => setViewChallenge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>MCQs</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {questionList?.map(q => (
              <div key={q.id} className="border p-2 rounded text-sm space-y-1">
                <div>{q.text}</div>
                <ul className="list-disc ml-4 text-xs space-y-1">
                  {q.options.map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                </ul>
                <p className="text-xs">Correct: {q.correctAnswer}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setEditQuestion(q)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    if (confirm('Delete this question?')) {
                      adminDeleteQuestion(viewChallenge!, q.id).then(() => refetchQuestions());
                    }
                  }}>Delete</Button>
                </div>
              </div>
            ))}
            {questionList && questionList.length === 0 && <p>No questions</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editQuestion} onOpenChange={() => setEditQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editQuestion && (
            <div className="space-y-4">
              <div>
                <Label>Question Text</Label>
                <SanitizedTextarea value={editQuestion.text} onChange={v => setEditQuestion(q => q ? { ...q, text: v } : q)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {editQuestion.options.map((opt, idx) => (
                  <SanitizedInput key={idx} value={opt} onChange={v => setEditQuestion(q => {
                    if (!q) return q;
                    const opts = [...q.options];
                    opts[idx] = v;
                    return { ...q, options: opts };
                  })} placeholder={`Option ${String.fromCharCode(65 + idx)}`} />
                ))}
              </div>
              <div>
                <Label>Correct Option</Label>
                <SanitizedInput value={editQuestion.correctAnswer} onChange={v => setEditQuestion(q => q ? { ...q, correctAnswer: v } : q)} />
              </div>
              <Button onClick={() => {
                if (!editQuestion || !viewChallenge) return;
                adminUpdateQuestion(viewChallenge, editQuestion.id, editQuestion.text, editQuestion.options, editQuestion.correctAnswer).then(() => {
                  setEditQuestion(null);
                  refetchQuestions();
                });
              }}>Update</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyChallengeManager;

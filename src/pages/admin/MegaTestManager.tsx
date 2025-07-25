import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMegaTests, 
  createMegaTest, 
  updateMegaTest,
  deleteMegaTest,
  copyMegaTest,
  getMegaTestParticipantCount,
  getMegaTestQuestionCount,
  MegaTest,
  QuizQuestion,
  QuizOption,
  adminAddOrUpdateLeaderboardEntry,
  getMegaTestLeaderboard,
  getMegaTestParticipants,
  getMegaTestById,
  getMegaTestPrizes
} from '../../services/firebase/quiz';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SanitizedInput } from "@/components/ui/sanitized-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { parseTimestamp } from '@/utils/parseTimestamp';
import { Plus, Pencil, Trash2, Copy, Clock, Trophy, ListChecks, CreditCard, Users, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { writeBatch } from 'firebase/firestore';
import { doc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Utility function to export array of objects to CSV and trigger download
function exportToCSV(filename: string, rows: any[], headers: string[], keys: string[]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => keys.map(key => {
      let val = row[key];
      if (val instanceof Date) val = val.toISOString();
      if (val && typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val ?? '';
    }).join(','))
  ].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const MegaTestManager = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isQuestionsDialogOpen, setIsQuestionsDialogOpen] = useState(false);
  const [selectedMegaTest, setSelectedMegaTest] = useState<MegaTest | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    practiceUrl: '',
    keyword: '',
    questions: [] as QuizQuestion[],
    registrationStartTime: '',
    registrationEndTime: '',
    testStartTime: '',
    testEndTime: '',
    resultTime: '',
    entryFee: 0,
    prizes: [] as { rank: number; prize: number }[],
    timeLimit: 60, // Default 60 minutes
    maxParticipants: 0,
    enabled: false,
  });

  const [questionForm, setQuestionForm] = useState({
    text: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' }
    ] as QuizOption[],
    correctAnswer: '',
  });

  const [bulkQuestionsText, setBulkQuestionsText] = useState('');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const [isLeaderboardDialogOpen, setIsLeaderboardDialogOpen] = useState(false);
  const [leaderboardMegaTest, setLeaderboardMegaTest] = useState<MegaTest | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardForm, setLeaderboardForm] = useState({
    userId: '',
    score: '',
    completionTime: '',
  });
  const [isSubmittingLeaderboard, setIsSubmittingLeaderboard] = useState(false);
  const [highlightDuplicateIPs, setHighlightDuplicateIPs] = useState(false);
  const [highlightDuplicateDeviceIDs, setHighlightDuplicateDeviceIDs] = useState(false);

  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false);
  const [participantsMegaTest, setParticipantsMegaTest] = useState<MegaTest | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [highlightDuplicateParticipantIPs, setHighlightDuplicateParticipantIPs] = useState(false);
  const [highlightDuplicateParticipantDeviceIDs, setHighlightDuplicateParticipantDeviceIDs] = useState(false);

  const participantsRef = useRef<any[]>([]); // Store participants for IP lookup

  const [isLoadingEditQuestions, setIsLoadingEditQuestions] = useState(false);
  const [isLoadingQuestionsDialog, setIsLoadingQuestionsDialog] = useState(false);

  const { data: megaTests, isLoading } = useQuery({
    queryKey: ['mega-tests'],
    queryFn: getMegaTests,
  });

  const { data: participantCounts } = useQuery({
    queryKey: ['mega-tests-participants'],
    queryFn: async () => {
      if (!megaTests) return {};
      const counts = await Promise.all(
        megaTests.map(async (test) => ({
          megaTestId: test.id,
          count: await getMegaTestParticipantCount(test.id)
        }))
      );
      return counts.reduce((acc, { megaTestId, count }) => ({
        ...acc,
        [megaTestId]: count
      }), {});
    },
    enabled: !!megaTests
  });

  const { data: questionCounts } = useQuery({
    queryKey: ['mega-tests-question-counts'],
    queryFn: async () => {
      if (!megaTests) return {};
      const counts = await Promise.all(
        megaTests.map(async (test) => ({
          megaTestId: test.id,
          count: await getMegaTestQuestionCount(test.id)
        }))
      );
      return counts.reduce((acc, { megaTestId, count }) => ({
        ...acc,
        [megaTestId]: count
      }), {} as Record<string, number>);
    },
    enabled: !!megaTests
  });

  const createMutation = useMutation({
    mutationFn: createMegaTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mega-tests'] });
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        practiceUrl: '',
        keyword: '',
        questions: [],
        registrationStartTime: '',
        registrationEndTime: '',
        testStartTime: '',
        testEndTime: '',
        resultTime: '',
        entryFee: 0,
        prizes: [],
        timeLimit: 60,
        maxParticipants: 0,
        enabled: false,
      });
      toast.success('Mega test created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create mega test');
      console.error('Error creating mega test:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MegaTest> }) => 
      updateMegaTest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mega-tests'] });
      setIsEditDialogOpen(false);
      setSelectedMegaTest(null);
      setFormData({
        title: '',
        description: '',
        practiceUrl: '',
        keyword: '',
        questions: [],
        registrationStartTime: '',
        registrationEndTime: '',
        testStartTime: '',
        testEndTime: '',
        resultTime: '',
        entryFee: 0,
        prizes: [],
        timeLimit: 60,
        maxParticipants: 0,
        enabled: false,
      });
      toast.success('Mega test updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update mega test');
      console.error('Error updating mega test:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMegaTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mega-tests'] });
      toast.success('Mega test deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete mega test');
      console.error('Error deleting mega test:', error);
    },
  });

  const copyMutation = useMutation({
    mutationFn: copyMegaTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mega-tests'] });
      toast.success('Mega test copied successfully');
    },
    onError: (error) => {
      toast.error('Failed to copy mega test');
      console.error('Error copying mega test:', error);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      questions: formData.questions,
      practiceUrl: formData.practiceUrl,
      registrationStartTime: Timestamp.fromDate(new Date(formData.registrationStartTime)),
      registrationEndTime: Timestamp.fromDate(new Date(formData.registrationEndTime)),
      testStartTime: Timestamp.fromDate(new Date(formData.testStartTime)),
      testEndTime: Timestamp.fromDate(new Date(formData.testEndTime)),
      resultTime: Timestamp.fromDate(new Date(formData.resultTime)),
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMegaTest) return;
    
    updateMutation.mutate({
      id: selectedMegaTest.id,
      data: {
        ...formData,
        questions: formData.questions,
        practiceUrl: formData.practiceUrl,
        registrationStartTime: Timestamp.fromDate(new Date(formData.registrationStartTime)),
        registrationEndTime: Timestamp.fromDate(new Date(formData.registrationEndTime)),
        testStartTime: Timestamp.fromDate(new Date(formData.testStartTime)),
        testEndTime: Timestamp.fromDate(new Date(formData.testEndTime)),
        resultTime: Timestamp.fromDate(new Date(formData.resultTime)),
      },
    });
  };

  const handleEdit = async (megaTest: MegaTest) => {
    setIsLoadingEditQuestions(true);
    try {
      const [{ megaTest: fullMegaTest, questions }, prizes] = await Promise.all([
        getMegaTestById(megaTest.id),
        getMegaTestPrizes(megaTest.id)
      ]);

      if (!fullMegaTest) {
        toast.error('Failed to fetch mega test details');
        return;
      }

      setSelectedMegaTest(fullMegaTest);
      setFormData({
        title: fullMegaTest.title,
        description: fullMegaTest.description,
        practiceUrl: fullMegaTest.practiceUrl || '',
        keyword: fullMegaTest.keyword || '',
        questions: questions || [],
        registrationStartTime: format(fullMegaTest.registrationStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        registrationEndTime: format(fullMegaTest.registrationEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        testStartTime: format(fullMegaTest.testStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        testEndTime: format(fullMegaTest.testEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        resultTime: format(fullMegaTest.resultTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        entryFee: fullMegaTest.entryFee,
        prizes: prizes || [],
        timeLimit: fullMegaTest.timeLimit || 60,
        maxParticipants: fullMegaTest.maxParticipants || 0,
        enabled: fullMegaTest.enabled ?? false,
      });
      setIsEditDialogOpen(true);
    } finally {
      setIsLoadingEditQuestions(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this mega test?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopy = (id: string) => {
    if (window.confirm('Create a copy of this mega test without user data or questions?')) {
      copyMutation.mutate(id);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: uuidv4(),
      text: questionForm.text,
      options: questionForm.options,
      correctAnswer: questionForm.correctAnswer,
    };

    const updatedQuestions = [...formData.questions, newQuestion];
    setFormData({ ...formData, questions: updatedQuestions });
    setQuestionForm({
      text: '',
      options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' }
      ],
      correctAnswer: '',
    });
  };

  const handleUpdateOption = (optionId: string, text: string) => {
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.map(option =>
        option.id === optionId ? { ...option, text } : option
      ),
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter(q => q.id !== questionId),
    });
  };

  const handleQuestionsDialogOpen = async (megaTest: MegaTest) => {
    setIsLoadingQuestionsDialog(true);
    try {
      const { questions } = await getMegaTestById(megaTest.id);
      setSelectedMegaTest(megaTest);
      setFormData({
        title: megaTest.title,
        description: megaTest.description,
        questions: questions || [],
        registrationStartTime: format(megaTest.registrationStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        registrationEndTime: format(megaTest.registrationEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        testStartTime: format(megaTest.testStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        testEndTime: format(megaTest.testEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        resultTime: format(megaTest.resultTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
        entryFee: megaTest.entryFee,
        prizes: [],
        timeLimit: megaTest.timeLimit || 60,
      });
      setIsQuestionsDialogOpen(true);
    } finally {
      setIsLoadingQuestionsDialog(false);
    }
  };

  const handleAddWinner = () => {
    setFormData({
      ...formData,
      prizes: [
        ...formData.prizes,
        { rank: formData.prizes.length + 1, prize: 0 }
      ],
    });
  };

  const handleRemoveWinner = (index: number) => {
    setFormData({
      ...formData,
      prizes: formData.prizes
        .filter((_, i) => i !== index)
        .map((prize, i) => ({ ...prize, rank: i + 1 })),
    });
  };

  const handleUpdateWinnerPrize = (index: number, value: string) => {
    const amount = parseFloat(value);
    if (isNaN(amount)) return;
    setFormData({
      ...formData,
      prizes: formData.prizes.map((prize, i) =>
        i === index ? { ...prize, prize: amount } : prize
      ),
    });
  };

  const handleBulkImport = () => {
    try {
      // Split by double newline to separate questions
      const questionBlocks = bulkQuestionsText.split('\n\n').filter(block => block.trim());
      const newQuestions: QuizQuestion[] = [];
      
      for (let i = 0; i < questionBlocks.length; i++) {
        const block = questionBlocks[i].trim();
        const lines = block.split('\n');
        
        // Find the line with options (contains |)
        const optionsLineIndex = lines.findIndex(line => line.includes('|'));
        if (optionsLineIndex === -1) {
          throw new Error(`Invalid format in question ${i + 1}. Missing options line.`);
        }
        
        // Combine all lines before the options line as the question text
        const questionText = lines.slice(0, optionsLineIndex).join('\n').trim();
        
        // Parse the options line
        const optionsLine = lines[optionsLineIndex];
        const lastPipeIndex = optionsLine.lastIndexOf('|');
        const questionPart = optionsLine.substring(0, lastPipeIndex);
        const parts = questionPart.split('|');
        const correctAnswer = optionsLine.substring(lastPipeIndex + 1).trim().toLowerCase();
        
        const options = parts.slice(1);
        
        if (options.length !== 4) {
          throw new Error(`Invalid format in question ${i + 1}. Each question must have exactly 4 options.`);
        }
        
        if (!['a', 'b', 'c', 'd'].includes(correctAnswer)) {
          throw new Error(`Invalid correct answer in question ${i + 1}. Must be a, b, c, or d`);
        }
        
        newQuestions.push({
          id: uuidv4(),
          text: questionText,
          options: [
            { id: 'a', text: options[0].trim() },
            { id: 'b', text: options[1].trim() },
            { id: 'c', text: options[2].trim() },
            { id: 'd', text: options[3].trim() }
          ],
          correctAnswer: correctAnswer
        });
      }
      
      if (newQuestions.length > 0) {
        setFormData(prev => ({
          ...prev,
          questions: [...prev.questions, ...newQuestions]
        }));
        setBulkQuestionsText('');
        setIsBulkImportOpen(false);
        toast.success(`Successfully imported ${newQuestions.length} questions`);
      } else {
        toast.error('No valid questions found in the input');
      }
    } catch (error) {
      console.error('Error importing questions:', error);
      toast.error('Failed to import questions. Please check the format.');
    }
  };

  // Fetch leaderboard entries and participant IPs when dialog opens
  useEffect(() => {
    if (isLeaderboardDialogOpen && leaderboardMegaTest) {
      setIsLoadingLeaderboard(true);
      Promise.all([
        getMegaTestLeaderboard(leaderboardMegaTest.id),
        getMegaTestParticipants(leaderboardMegaTest.id)
      ])
        .then(([leaderboard, participants]) => {
          participantsRef.current = participants;
          // Merge ipAddress into leaderboard entries
          const merged = leaderboard.map(entry => {
            const participant = participants.find((p: any) => p.userId === entry.userId);
            return {
              ...entry,
              ipAddress: participant?.ipAddress || 'N/A',
              username: participant?.username || '',
              email: participant?.email || '',
              deviceId: participant?.deviceId || 'N/A',
            };
          });
          setLeaderboardEntries(merged);
        })
        .finally(() => setIsLoadingLeaderboard(false));
    }
  }, [isLeaderboardDialogOpen, leaderboardMegaTest]);

  const openLeaderboardDialog = (megaTest: MegaTest) => {
    setLeaderboardMegaTest(megaTest);
    setIsLeaderboardDialogOpen(true);
  };

  const closeLeaderboardDialog = () => {
    setIsLeaderboardDialogOpen(false);
    setLeaderboardMegaTest(null);
    setLeaderboardEntries([]);
    setLeaderboardForm({ userId: '', score: '', completionTime: '' });
  };

  const handleLeaderboardFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLeaderboardForm({ ...leaderboardForm, [e.target.name]: e.target.value });
  };

  const handleAddOrUpdateLeaderboardEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderboardMegaTest) return;
    setIsSubmittingLeaderboard(true);
    const { userId, score, completionTime } = leaderboardForm;
    const ok = await adminAddOrUpdateLeaderboardEntry(
      leaderboardMegaTest.id,
      userId.trim(),
      Number(score),
      Number(completionTime)
    );
    if (ok) {
      toast.success('Leaderboard entry added/updated');
      setLeaderboardForm({ userId: '', score: '', completionTime: '' });
      // Refresh leaderboard and participants, then merge IPs
      const [entries, participants] = await Promise.all([
        getMegaTestLeaderboard(leaderboardMegaTest.id),
        getMegaTestParticipants(leaderboardMegaTest.id)
      ]);
      participantsRef.current = participants;
      const merged = entries.map(entry => {
        const participant = participants.find((p: any) => p.userId === entry.userId);
        return {
          ...entry,
          ipAddress: participant?.ipAddress || 'N/A',
          username: participant?.username || '',
          email: participant?.email || '',
          deviceId: participant?.deviceId || 'N/A',
        };
      });
      setLeaderboardEntries(merged);
    } else {
      toast.error('Failed to add/update entry');
    }
    setIsSubmittingLeaderboard(false);
  };

  const handleDeleteLeaderboardEntry = async (userId: string) => {
    if (!leaderboardMegaTest) return;
    setIsSubmittingLeaderboard(true);
    // Remove the entry from Firestore by filtering it out and rewriting the leaderboard
    const filtered = leaderboardEntries.filter(entry => entry.userId !== userId);
    // Recalculate ranks and update Firestore
    const batch = writeBatch(db);
    filtered.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.completionTime !== b.completionTime) {
        return a.completionTime - b.completionTime;
      }
      const aTime = parseTimestamp(a.submittedAt).getTime();
      const bTime = parseTimestamp(b.submittedAt).getTime();
      return aTime - bTime;
    });
    filtered.forEach((entry, idx) => {
      const entryRef = doc(collection(db, 'mega-tests', leaderboardMegaTest.id, 'leaderboard'), entry.userId);
      batch.set(entryRef, { ...entry, rank: idx + 1 });
    });
    // Delete the removed entry
    const delRef = doc(collection(db, 'mega-tests', leaderboardMegaTest.id, 'leaderboard'), userId);
    batch.delete(delRef);
    await batch.commit();
    toast.success('Entry deleted');
    // Refresh leaderboard and participants, then merge IPs
    const [entries, participants] = await Promise.all([
      getMegaTestLeaderboard(leaderboardMegaTest.id),
      getMegaTestParticipants(leaderboardMegaTest.id)
    ]);
    participantsRef.current = participants;
    const merged = entries.map(entry => {
      const participant = participants.find((p: any) => p.userId === entry.userId);
      return {
        ...entry,
        ipAddress: participant?.ipAddress || 'N/A',
        username: participant?.username || '',
        email: participant?.email || '',
        deviceId: participant?.deviceId || 'N/A',
      };
    });
    setLeaderboardEntries(merged);
    setIsSubmittingLeaderboard(false);
  };

  const openParticipantsDialog = async (megaTest: MegaTest) => {
    setParticipantsMegaTest(megaTest);
    setIsParticipantsDialogOpen(true);
    setIsLoadingParticipants(true);
    try {
      const data = await getMegaTestParticipants(megaTest.id);
      setParticipants(data);
    } catch (e) {
      setParticipants([]);
    }
    setIsLoadingParticipants(false);
  };

  const closeParticipantsDialog = () => {
    setIsParticipantsDialogOpen(false);
    setParticipantsMegaTest(null);
    setParticipants([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Trophy className="h-6 w-6 mr-2 text-amber-500" />
          Mega Test Manager
        </h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Mega Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
              <DialogTitle>Create New Mega Test</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="practiceUrl">Practice URL</Label>
              <SanitizedInput
                id="practiceUrl"
                value={formData.practiceUrl}
                onChange={(v) => setFormData({ ...formData, practiceUrl: v })}
              />
            </div>
              <div>
                <Label htmlFor="registrationStartTime">Registration Start Time</Label>
                <Input
                  id="registrationStartTime"
                  type="datetime-local"
                  value={formData.registrationStartTime}
                  onChange={(e) => setFormData({ ...formData, registrationStartTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="registrationEndTime">Registration End Time</Label>
                <Input
                  id="registrationEndTime"
                  type="datetime-local"
                  value={formData.registrationEndTime}
                  onChange={(e) => setFormData({ ...formData, registrationEndTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="testStartTime">Test Start Time</Label>
                <Input
                  id="testStartTime"
                  type="datetime-local"
                  value={formData.testStartTime}
                  onChange={(e) => setFormData({ ...formData, testStartTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="testEndTime">Test End Time</Label>
                <Input
                  id="testEndTime"
                  type="datetime-local"
                  value={formData.testEndTime}
                  onChange={(e) => setFormData({ ...formData, testEndTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="resultTime">Result Time</Label>
                <Input
                  id="resultTime"
                  type="datetime-local"
                  value={formData.resultTime}
                  onChange={(e) => setFormData({ ...formData, resultTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="entryFee">Entry Fee (₹)</Label>
                <Input
                  id="entryFee"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.entryFee}
                  onChange={(e) => setFormData({ ...formData, entryFee: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 60 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="maxParticipants">Max Participants (0 for unlimited)</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-4">
                <Label>Prizes</Label>
                <div className="space-y-4">
                  {formData.prizes.map((prize, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-bold">
                        {prize.rank}
                      </div>
                      <Input
                        type="number"
                        value={prize.prize}
                        onChange={(e) => handleUpdateWinnerPrize(index, e.target.value)}
                        placeholder={`Cash prize for ${prize.rank}${prize.rank === 1 ? 'st' : prize.rank === 2 ? 'nd' : prize.rank === 3 ? 'rd' : 'th'} place`}
                        required
                      />
                      {index >= 3 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveWinner(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddWinner}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Winner
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Create Mega Test
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {megaTests?.map((megaTest) => (
          <Card key={megaTest.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CardTitle>{megaTest.title}</CardTitle>
                  <Switch
                    checked={!!megaTest.enabled}
                    onCheckedChange={(checked) => updateMutation.mutate({ id: megaTest.id, data: { enabled: checked } })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuestionsDialogOpen(megaTest)}
                  >
                    <ListChecks className="h-4 w-4 mr-2" />
                    Manage Questions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(megaTest)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(megaTest.id)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(megaTest.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLeaderboardDialog(megaTest)}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Manage Leaderboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openParticipantsDialog(megaTest)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Participants
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{megaTest.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Registration: {format(megaTest.registrationStartTime.toDate(), 'MMM d, yyyy HH:mm')} - {format(megaTest.registrationEndTime.toDate(), 'MMM d, yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Test: {format(megaTest.testStartTime.toDate(), 'MMM d, yyyy HH:mm')} - {format(megaTest.testEndTime.toDate(), 'MMM d, yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Results: {format(megaTest.resultTime.toDate(), 'MMM d, yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center">
                  <ListChecks className="h-4 w-4 mr-1" />
                  <span>{questionCounts?.[megaTest.id] ?? megaTest.totalQuestions} Questions</span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-1" />
                  <span>Entry Fee: ₹{megaTest.entryFee}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>Participants: {participantCounts?.[megaTest.id] || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isQuestionsDialogOpen} onOpenChange={setIsQuestionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Manage Questions - {selectedMegaTest?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pb-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Add New Question</h3>
                <Button
                  variant="outline"
                  onClick={() => setIsBulkImportOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </Button>
              </div>
              <div>
                <Label htmlFor="questionText">Question Text</Label>
                <Textarea
                  id="questionText"
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="Enter your question"
                />
              </div>
              
              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  {questionForm.options.map((option) => (
                    <div key={option.id} className="flex gap-2">
                      <Input
                        value={option.text}
                        onChange={(e) => handleUpdateOption(option.id, e.target.value)}
                        placeholder="Enter option text"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="correctAnswer">Correct Answer</Label>
                <div className="grid grid-cols-2 gap-2">
                  {questionForm.options.map((option) => (
                    <Button
                      key={option.id}
                      type="button"
                      variant={questionForm.correctAnswer === option.id ? "default" : "outline"}
                      onClick={() => setQuestionForm({ ...questionForm, correctAnswer: option.id })}
                      className="w-full"
                    >
                      Option {option.id.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddQuestion}
                disabled={!questionForm.text || questionForm.options.length < 2 || !questionForm.correctAnswer}
              >
                Add Question
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Existing Questions</h3>
              {formData.questions.map((question) => (
                <Card key={question.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2 w-full">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="prose prose-sm max-w-none">
                              <div className="mb-2">
                                {question.text.toLowerCase().includes('assertion') && question.text.toLowerCase().includes('reason') ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Assertion & Reasoning
                                  </span>
                                ) : question.text.toLowerCase().includes('match') ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                    Matching
                                  </span>
                                ) : null}
                              </div>
                              
                              <div className="space-y-2">
                                {question.text.split('\n').map((line, index) => {
                                  if (line.toLowerCase().includes('assertion:') || line.toLowerCase().includes('reason:')) {
                                    const [type, content] = line.split(':').map(part => part.trim());
                                    return (
                                      <div key={index} className="flex gap-2 items-start">
                                        <span className="font-semibold min-w-[80px]">{type}:</span>
                                        <span>{content}</span>
                                      </div>
                                    );
                                  }
                                  else if (line.includes('|')) {
                                    const [left, right] = line.split('|').map(part => part.trim());
                                    return (
                                      <div key={index} className="flex gap-4 items-center">
                                        <span className="flex-1">{left}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="flex-1">{right}</span>
                                      </div>
                                    );
                                  }
                                  return <p key={index} className="mb-2">{line}</p>;
                                })}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-2 mt-4">
                          {question.options.map((option) => (
                            <div
                              key={option.id}
                              className={`p-3 rounded-lg border ${
                                option.id === question.correctAnswer
                                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-sm">{option.id.toUpperCase()}.</span>
                                <div className="flex-1 text-sm">
                                  {option.text.split('\n').map((line, index) => {
                                    if (line.includes('|')) {
                                      const [left, right] = line.split('|').map(part => part.trim());
                                      return (
                                        <div key={index} className="flex gap-4 items-center">
                                          <span className="flex-1">{left}</span>
                                          <span className="text-gray-400">→</span>
                                          <span className="flex-1">{right}</span>
                                        </div>
                                      );
                                    }
                                    return <p key={index} className="mb-1 last:mb-0">{line}</p>;
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 sticky bottom-0 bg-background pt-4">
              <Button
                variant="outline"
                onClick={() => setIsQuestionsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedMegaTest) {
                    updateMutation.mutate({
                      id: selectedMegaTest.id,
                      data: { questions: formData.questions },
                    });
                    setIsQuestionsDialogOpen(false);
                    setSelectedMegaTest(null);
                    setFormData({
                      title: '',
                      description: '',
                      questions: [],
                      registrationStartTime: '',
                      registrationEndTime: '',
                      testStartTime: '',
                      testEndTime: '',
                      resultTime: '',
                      entryFee: 0,
                      prizes: [],
                      timeLimit: 60,
                    });
                  }
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <Label>Questions Format</Label>
              <div className="text-sm text-gray-500 mb-2 overflow-y-auto max-h-[200px] pr-2">
                Enter questions in the following format. Each question should be separated by a blank line.<br /><br />
                
                <strong>Simple Question:</strong><br />
                What is the capital of France? | London | Berlin | Paris | Madrid | a<br /><br />
                
                <strong>Assertion & Reasoning:</strong><br />
                Assertion: The Earth is flat.<br />
                Reason: The horizon appears flat when we look at it.<br />
                Choose the correct option: | Both Assertion and Reason are true and Reason is the correct explanation of Assertion | Both Assertion and Reason are true but Reason is not the correct explanation of Assertion | Assertion is true but Reason is false | Both Assertion and Reason are false | d<br /><br />
                
                <strong>Matching Type:</strong><br />
                Match the following:<br />
                Column A:<br />
                1. Capital of France<br />
                2. Capital of Japan<br />
                3. Capital of India<br />
                Column B:<br />
                a. Tokyo<br />
                b. New Delhi<br />
                c. Paris<br />
                Choose the correct matching: | 1-c, 2-a, 3-b | 1-a, 2-b, 3-c | 1-b, 2-c, 3-a | 1-c, 2-b, 3-a | a
              </div>
              <Textarea
                value={bulkQuestionsText}
                onChange={(e) => setBulkQuestionsText(e.target.value)}
                placeholder="Enter questions here..."
                className="h-[300px] font-mono resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport}>
              Import Questions
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Edit Mega Test</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-keyword">Keyword</Label>
              <Input
                id="edit-keyword"
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-practiceUrl">Practice URL</Label>
              <SanitizedInput
                id="edit-practiceUrl"
                value={formData.practiceUrl}
                onChange={(v) => setFormData({ ...formData, practiceUrl: v })}
              />
            </div>
            <div>
              <Label htmlFor="edit-registrationStartTime">Registration Start Time</Label>
              <Input
                id="edit-registrationStartTime"
                type="datetime-local"
                value={formData.registrationStartTime}
                onChange={(e) => setFormData({ ...formData, registrationStartTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-registrationEndTime">Registration End Time</Label>
              <Input
                id="edit-registrationEndTime"
                type="datetime-local"
                value={formData.registrationEndTime}
                onChange={(e) => setFormData({ ...formData, registrationEndTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-testStartTime">Test Start Time</Label>
              <Input
                id="edit-testStartTime"
                type="datetime-local"
                value={formData.testStartTime}
                onChange={(e) => setFormData({ ...formData, testStartTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-testEndTime">Test End Time</Label>
              <Input
                id="edit-testEndTime"
                type="datetime-local"
                value={formData.testEndTime}
                onChange={(e) => setFormData({ ...formData, testEndTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-resultTime">Result Time</Label>
              <Input
                id="edit-resultTime"
                type="datetime-local"
                value={formData.resultTime}
                onChange={(e) => setFormData({ ...formData, resultTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-entryFee">Entry Fee (₹)</Label>
              <Input
                id="edit-entryFee"
                type="number"
                min="0"
                step="1"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-timeLimit">Time Limit (minutes)</Label>
              <Input
                id="edit-timeLimit"
                type="number"
                min="1"
                step="1"
                value={formData.timeLimit}
                onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 60 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-maxParticipants">Max Participants (0 for unlimited)</Label>
              <Input
                id="edit-maxParticipants"
                type="number"
                min="0"
                step="1"
                value={formData.maxParticipants}
                onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-4">
              <Label>Prizes</Label>
              <div className="space-y-4">
                {formData.prizes.map((prize, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-bold">
                      {prize.rank}
                    </div>
                    <Input
                      type="number"
                      value={prize.prize}
                      onChange={(e) => handleUpdateWinnerPrize(index, e.target.value)}
                      placeholder={`Cash prize for ${prize.rank}${prize.rank === 1 ? 'st' : prize.rank === 2 ? 'nd' : prize.rank === 3 ? 'rd' : 'th'} place`}
                      required
                    />
                    {index >= 3 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveWinner(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddWinner}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Winner
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Update Mega Test
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLeaderboardDialogOpen} onOpenChange={setIsLeaderboardDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Manage Leaderboard - {leaderboardMegaTest?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center mb-4 gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={highlightDuplicateIPs}
                onChange={e => setHighlightDuplicateIPs(e.target.checked)}
                className="accent-amber-500"
              />
              Highlight users with same IP address
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={highlightDuplicateDeviceIDs}
                onChange={e => setHighlightDuplicateDeviceIDs(e.target.checked)}
                className="accent-amber-500"
              />
              Highlight users with same Device ID
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const ipCount: Record<string, number> = {};
                leaderboardEntries.forEach(entry => {
                  if (entry.ipAddress && entry.ipAddress !== 'N/A') {
                    ipCount[entry.ipAddress] = (ipCount[entry.ipAddress] || 0) + 1;
                  }
                });
                const deviceIdCount: Record<string, number> = {};
                leaderboardEntries.forEach(entry => {
                  if (entry.deviceId && entry.deviceId !== 'N/A') {
                    deviceIdCount[entry.deviceId] = (deviceIdCount[entry.deviceId] || 0) + 1;
                  }
                });

                let filteredEntries = leaderboardEntries;
                if (highlightDuplicateIPs) {
                  filteredEntries = filteredEntries.filter(entry => entry.ipAddress && entry.ipAddress !== 'N/A' && ipCount[entry.ipAddress] > 1);
                }
                if (highlightDuplicateDeviceIDs) {
                  filteredEntries = filteredEntries.filter(entry => entry.deviceId && entry.deviceId !== 'N/A' && deviceIdCount[entry.deviceId] > 1);
                }
                
                exportToCSV(
                  `leaderboard-${leaderboardMegaTest?.title || 'megatest'}.csv`,
                  filteredEntries,
                  ['Rank', 'User ID', 'Username', 'Email', 'IP Address', 'Score', 'Completion Time', 'Device ID'],
                  ['rank', 'userId', 'username', 'email', 'ipAddress', 'score', 'completionTime', 'deviceId']
                );
              }}
            >
              Export to CSV
            </Button>
          </div>
          <form onSubmit={handleAddOrUpdateLeaderboardEntry} className="space-y-4 mb-4">
            <div className="flex gap-2">
              <Input
                name="userId"
                placeholder="User ID"
                value={leaderboardForm.userId}
                onChange={handleLeaderboardFormChange}
                required
              />
              <Input
                name="score"
                type="number"
                placeholder="Score"
                value={leaderboardForm.score}
                onChange={handleLeaderboardFormChange}
                required
              />
              <Input
                name="completionTime"
                type="number"
                placeholder="Completion Time (s)"
                value={leaderboardForm.completionTime}
                onChange={handleLeaderboardFormChange}
                required
              />
              <Button type="submit" disabled={isSubmittingLeaderboard}>
                {isSubmittingLeaderboard ? 'Saving...' : 'Add/Update'}
              </Button>
            </div>
          </form>
          <div className="flex-1 min-h-0">
            <h3 className="font-semibold mb-2">Current Leaderboard</h3>
            {isLoadingLeaderboard ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                <div className="space-y-2">
                  {leaderboardEntries.length === 0 && <div className="text-muted-foreground">No entries yet</div>}
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: 900 }}>
                      <div className="flex items-center gap-2 p-2 border-b font-semibold text-xs uppercase text-gray-500">
                        <span className="w-8">Rank</span>
                        <span className="flex-1">User ID</span>
                        <span className="w-32 text-center">Username</span>
                        <span className="w-48 text-center">Email</span>
                        <span className="w-32 text-center">IP Address</span>
                        <span className="w-40 text-center">Device ID</span>
                        <span className="w-20 text-center">Score</span>
                        <span className="w-24 text-center">Completion Time</span>
                        <span className="w-20"></span>
                      </div>
                      {(() => {
                        const ipCount: Record<string, number> = {};
                        leaderboardEntries.forEach(entry => {
                          if (entry.ipAddress && entry.ipAddress !== 'N/A') {
                            ipCount[entry.ipAddress] = (ipCount[entry.ipAddress] || 0) + 1;
                          }
                        });

                        const deviceIdCount: Record<string, number> = {};
                        leaderboardEntries.forEach(entry => {
                          if (entry.deviceId && entry.deviceId !== 'N/A') {
                            deviceIdCount[entry.deviceId] = (deviceIdCount[entry.deviceId] || 0) + 1;
                          }
                        });

                        let filteredEntries = leaderboardEntries;
                        if (highlightDuplicateIPs) {
                          filteredEntries = filteredEntries.filter(entry => entry.ipAddress && entry.ipAddress !== 'N/A' && ipCount[entry.ipAddress] > 1);
                        }
                        if (highlightDuplicateDeviceIDs) {
                          filteredEntries = filteredEntries.filter(entry => entry.deviceId && entry.deviceId !== 'N/A' && deviceIdCount[entry.deviceId] > 1);
                        }
                        
                        return filteredEntries.map(entry => {
                          const hasDuplicateIP = entry.ipAddress && entry.ipAddress !== 'N/A' && ipCount[entry.ipAddress] > 1;
                          const hasDuplicateDeviceID = entry.deviceId && entry.deviceId !== 'N/A' && deviceIdCount[entry.deviceId] > 1;

                          const isHighlighted = (highlightDuplicateIPs && hasDuplicateIP) || (highlightDuplicateDeviceIDs && hasDuplicateDeviceID);
                          
                          return (
                            <div
                              key={entry.userId}
                              className={`flex items-center gap-2 p-2 border rounded hover:bg-muted/50 transition-colors text-sm ${isHighlighted ? 'bg-yellow-100 border-yellow-400' : ''}`}
                            >
                      <span className="w-8 font-medium">#{entry.rank}</span>
                      <span className="flex-1 font-medium">{entry.userId}</span>
                              <span className="w-32 text-center">{entry.username}</span>
                              <span className="w-48 text-center">{entry.email}</span>
                              <span className="w-32 text-center flex items-center justify-center gap-1">
                                {entry.ipAddress}
                                {hasDuplicateIP && (
                                  <span title="Duplicate IP" className="text-amber-500" style={{ fontSize: '1.1em' }}>⚠️</span>
                                )}
                              </span>
                              <span className="w-40 truncate text-center flex items-center justify-center gap-1" title={entry.deviceId}>
                                {entry.deviceId}
                                {hasDuplicateDeviceID && (
                                  <span title="Duplicate Device ID" className="text-amber-500" style={{ fontSize: '1.1em' }}>⚠️</span>
                                )}
                              </span>
                      <span className="w-20 text-center">{entry.score} pts</span>
                      <span className="w-24 text-center">{entry.completionTime}s</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteLeaderboardEntry(entry.userId)}
                        disabled={isSubmittingLeaderboard}
                      >
                        Delete
                      </Button>
                    </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t">
            <Button variant="outline" onClick={closeLeaderboardDialog}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isParticipantsDialogOpen} onOpenChange={setIsParticipantsDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Participants for {participantsMegaTest?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center mb-4 gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={highlightDuplicateParticipantIPs}
                onChange={e => setHighlightDuplicateParticipantIPs(e.target.checked)}
                className="accent-amber-500"
              />
              Highlight users with same IP address
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={highlightDuplicateParticipantDeviceIDs}
                onChange={e => setHighlightDuplicateParticipantDeviceIDs(e.target.checked)}
                className="accent-amber-500"
              />
              Highlight users with same Device ID
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const ipCount: Record<string, number> = {};
                participants.forEach(participant => {
                  if (participant.ipAddress && participant.ipAddress !== 'N/A') {
                    ipCount[participant.ipAddress] = (ipCount[participant.ipAddress] || 0) + 1;
                  }
                });
                const deviceIdCount: Record<string, number> = {};
                participants.forEach(participant => {
                  if (participant.deviceId && participant.deviceId !== 'N/A') {
                    deviceIdCount[participant.deviceId] = (deviceIdCount[participant.deviceId] || 0) + 1;
                  }
                });
                let filteredParticipants = participants;
                if (highlightDuplicateParticipantIPs) {
                  filteredParticipants = filteredParticipants.filter(participant => participant.ipAddress && participant.ipAddress !== 'N/A' && ipCount[participant.ipAddress] > 1);
                }
                if (highlightDuplicateParticipantDeviceIDs) {
                  filteredParticipants = filteredParticipants.filter(participant => participant.deviceId && participant.deviceId !== 'N/A' && deviceIdCount[participant.deviceId] > 1);
                }
                exportToCSV(
                  `participants-${participantsMegaTest?.title || 'megatest'}.csv`,
                  filteredParticipants.map(p => ({
                    ...p,
                    registeredAt: p.registeredAt && p.registeredAt.toDate ? p.registeredAt.toDate() : ''
                  })),
                  ['User ID', 'Username', 'Email', 'Registered At', 'Registered IP', 'Last Seen IP', 'Device ID'],
                  ['userId', 'username', 'email', 'registeredAt', 'ipAddress', 'lastSeenIP', 'deviceId']
                );
              }}
            >
              Export to CSV
            </Button>
          </div>
          <div className="mt-4">
            {isLoadingParticipants ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered At</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered IP</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen IP</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const ipCount: Record<string, number> = {};
                      participants.forEach(participant => {
                        if (participant.ipAddress && participant.ipAddress !== 'N/A') {
                          ipCount[participant.ipAddress] = (ipCount[participant.ipAddress] || 0) + 1;
                        }
                      });
                      const deviceIdCount: Record<string, number> = {};
                      participants.forEach(participant => {
                        if (participant.deviceId && participant.deviceId !== 'N/A') {
                          deviceIdCount[participant.deviceId] = (deviceIdCount[participant.deviceId] || 0) + 1;
                        }
                      });
                      let filteredParticipants = participants;
                      if (highlightDuplicateParticipantIPs) {
                        filteredParticipants = filteredParticipants.filter(participant => participant.ipAddress && participant.ipAddress !== 'N/A' && ipCount[participant.ipAddress] > 1);
                      }
                      if (highlightDuplicateParticipantDeviceIDs) {
                        filteredParticipants = filteredParticipants.filter(participant => participant.deviceId && participant.deviceId !== 'N/A' && deviceIdCount[participant.deviceId] > 1);
                      }
                      return filteredParticipants.map(participant => {
                        const hasDuplicateIP = participant.ipAddress && participant.ipAddress !== 'N/A' && ipCount[participant.ipAddress] > 1;
                        const hasDuplicateDeviceID = participant.deviceId && participant.deviceId !== 'N/A' && deviceIdCount[participant.deviceId] > 1;
                        const isHighlighted = (highlightDuplicateParticipantIPs && hasDuplicateIP) || (highlightDuplicateParticipantDeviceIDs && hasDuplicateDeviceID);
                        return (
                          <tr
                            key={participant.userId}
                            className={isHighlighted ? 'bg-yellow-100 border-yellow-400' : ''}
                          >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.userId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.registeredAt
                            ? format(
                                typeof participant.registeredAt.toDate === 'function'
                                  ? participant.registeredAt.toDate()
                                  : new Date(participant.registeredAt),
                                'MMM d, yyyy h:mm a'
                              )
                            : 'N/A'}
                        </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-1">
                              {participant.ipAddress}
                              {hasDuplicateIP && (
                                <span title="Duplicate IP" className="text-amber-500" style={{ fontSize: '1.1em' }}>⚠️</span>
                              )}
                            </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.lastSeenIP}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-1">
                          {participant.deviceId}
                          {hasDuplicateDeviceID && (
                            <span title="Duplicate Device ID" className="text-amber-500" style={{ fontSize: '1.1em' }}>⚠️</span>
                          )}
                        </td>
                      </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={closeParticipantsDialog}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MegaTestManager; 
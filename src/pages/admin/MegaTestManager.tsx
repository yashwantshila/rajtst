import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMegaTests, 
  createMegaTest, 
  updateMegaTest, 
  deleteMegaTest,
  getMegaTestParticipantCount,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Clock, Trophy, ListChecks, CreditCard, Users, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { writeBatch, doc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/config';

// Utility function to export array of objects to CSV and trigger download
function exportToCSV(filename: string, rows: any[], headers: string[], keys:string[]) {
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

// #region Memoized Card Component
const MegaTestCard = memo(({
  megaTest,
  participantCount,
  onEdit,
  onDelete,
  onManageQuestions,
  onManageLeaderboard,
  onViewParticipants,
}: {
  megaTest: MegaTest;
  participantCount: number;
  onEdit: (megaTest: MegaTest) => void;
  onDelete: (id: string) => void;
  onManageQuestions: (megaTest: MegaTest) => void;
  onManageLeaderboard: (megaTest: MegaTest) => void;
  onViewParticipants: (megaTest: MegaTest) => void;
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{megaTest.title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onManageQuestions(megaTest)}>
              <ListChecks className="h-4 w-4 mr-2" /> Manage Questions
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(megaTest)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(megaTest.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => onManageLeaderboard(megaTest)}>
              <Trophy className="h-4 w-4 mr-2" /> Manage Leaderboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => onViewParticipants(megaTest)}>
              <Users className="h-4 w-4 mr-2" /> View Participants
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">{megaTest.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <div className="flex items-center"><Clock className="h-4 w-4 mr-1" /><span>Registration: {format(megaTest.registrationStartTime.toDate(), 'MMM d, yyyy HH:mm')} - {format(megaTest.registrationEndTime.toDate(), 'MMM d, yyyy HH:mm')}</span></div>
          <div className="flex items-center"><Clock className="h-4 w-4 mr-1" /><span>Test: {format(megaTest.testStartTime.toDate(), 'MMM d, yyyy HH:mm')} - {format(megaTest.testEndTime.toDate(), 'MMM d, yyyy HH:mm')}</span></div>
          <div className="flex items-center"><Clock className="h-4 w-4 mr-1" /><span>Results: {format(megaTest.resultTime.toDate(), 'MMM d, yyyy HH:mm')}</span></div>
          <div className="flex items-center"><ListChecks className="h-4 w-4 mr-1" /><span>{megaTest.totalQuestions} Questions</span></div>
          <div className="flex items-center"><CreditCard className="h-4 w-4 mr-1" /><span>Entry Fee: ₹{megaTest.entryFee}</span></div>
          <div className="flex items-center"><Users className="h-4 w-4 mr-1" /><span>Participants: {participantCount}</span></div>
        </div>
      </CardContent>
    </Card>
  );
});
// #endregion

// #region Dialog Components

// Combined Dialog for Creating and Editing Mega Tests
const MegaTestFormDialog = ({
  isOpen,
  onClose,
  megaTest
}: {
  isOpen: boolean;
  onClose: () => void;
  megaTest: MegaTest | null;
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    registrationStartTime: '',
    registrationEndTime: '',
    testStartTime: '',
    testEndTime: '',
    resultTime: '',
    entryFee: 0,
    prizes: [] as { rank: number; prize: string }[],
    timeLimit: 60,
  });

  useEffect(() => {
    if (megaTest && isOpen) {
        // Fetch prizes separately when editing
        getMegaTestPrizes(megaTest.id).then(prizes => {
            setFormData({
                title: megaTest.title,
                description: megaTest.description,
                registrationStartTime: format(megaTest.registrationStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
                registrationEndTime: format(megaTest.registrationEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
                testStartTime: format(megaTest.testStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
                testEndTime: format(megaTest.testEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
                resultTime: format(megaTest.resultTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
                entryFee: megaTest.entryFee,
                prizes: prizes || [],
                timeLimit: megaTest.timeLimit || 60,
            });
        });
    } else {
      setFormData({
        title: '', description: '', registrationStartTime: '', registrationEndTime: '',
        testStartTime: '', testEndTime: '', resultTime: '', entryFee: 0,
        prizes: [], timeLimit: 60,
      });
    }
  }, [megaTest, isOpen]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mega-tests'] });
      toast.success(`Mega test ${megaTest ? 'updated' : 'created'} successfully`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to ${megaTest ? 'update' : 'create'} mega test`);
      console.error(`Error ${megaTest ? 'updating' : 'creating'} mega test:`, error);
    },
  };

  const createMutation = useMutation({ mutationFn: createMegaTest, ...mutationOptions });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<MegaTest> }) => updateMegaTest(id, data), ...mutationOptions });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      registrationStartTime: Timestamp.fromDate(new Date(formData.registrationStartTime)),
      registrationEndTime: Timestamp.fromDate(new Date(formData.registrationEndTime)),
      testStartTime: Timestamp.fromDate(new Date(formData.testStartTime)),
      testEndTime: Timestamp.fromDate(new Date(formData.testEndTime)),
      resultTime: Timestamp.fromDate(new Date(formData.resultTime)),
    };

    if (megaTest) {
      updateMutation.mutate({ id: megaTest.id, data: submissionData });
    } else {
      createMutation.mutate({ ...submissionData, questions: [] });
    }
  };
  
  const handleAddWinner = () => setFormData(prev => ({ ...prev, prizes: [...prev.prizes, { rank: prev.prizes.length + 1, prize: '' }] }));
  const handleRemoveWinner = (index: number) => setFormData(prev => ({ ...prev, prizes: prev.prizes.filter((_, i) => i !== index).map((p, i) => ({ ...p, rank: i + 1 })) }));
  const handleUpdateWinnerPrize = (index: number, value: string) => setFormData(prev => ({ ...prev, prizes: prev.prizes.map((p, i) => i === index ? { ...p, prize: value } : p) }));

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
          <DialogTitle>{megaTest ? 'Edit' : 'Create'} Mega Test</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          </div>
          <div><Label htmlFor="registrationStartTime">Registration Start Time</Label><Input id="registrationStartTime" type="datetime-local" value={formData.registrationStartTime} onChange={(e) => setFormData({ ...formData, registrationStartTime: e.target.value })} required /></div>
          <div><Label htmlFor="registrationEndTime">Registration End Time</Label><Input id="registrationEndTime" type="datetime-local" value={formData.registrationEndTime} onChange={(e) => setFormData({ ...formData, registrationEndTime: e.target.value })} required /></div>
          <div><Label htmlFor="testStartTime">Test Start Time</Label><Input id="testStartTime" type="datetime-local" value={formData.testStartTime} onChange={(e) => setFormData({ ...formData, testStartTime: e.target.value })} required /></div>
          <div><Label htmlFor="testEndTime">Test End Time</Label><Input id="testEndTime" type="datetime-local" value={formData.testEndTime} onChange={(e) => setFormData({ ...formData, testEndTime: e.target.value })} required /></div>
          <div><Label htmlFor="resultTime">Result Time</Label><Input id="resultTime" type="datetime-local" value={formData.resultTime} onChange={(e) => setFormData({ ...formData, resultTime: e.target.value })} required /></div>
          <div><Label htmlFor="entryFee">Entry Fee (₹)</Label><Input id="entryFee" type="number" min="0" step="1" value={formData.entryFee} onChange={(e) => setFormData({ ...formData, entryFee: parseInt(e.target.value) || 0 })} required /></div>
          <div><Label htmlFor="timeLimit">Time Limit (minutes)</Label><Input id="timeLimit" type="number" min="1" step="1" value={formData.timeLimit} onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 60 })} required /></div>
          {/* Prizes Section */}
          <div className="space-y-4">
              <Label>Prizes</Label>
              <div className="space-y-4">
                  {formData.prizes.map((prize, index) => (
                      <div key={index} className="flex gap-2 items-center">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-bold">{prize.rank}</div>
                          <Input value={prize.prize} onChange={(e) => handleUpdateWinnerPrize(index, e.target.value)} placeholder={`Enter prize for rank ${prize.rank}`} required/>
                          {index >= 3 && (<Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveWinner(index)}><Trash2 className="h-4 w-4" /></Button>)}
                      </div>
                  ))}
                  <Button type="button" variant="outline" onClick={handleAddWinner}><Plus className="h-4 w-4 mr-2" />Add Winner</Button>
              </div>
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (megaTest ? 'Update Mega Test' : 'Create Mega Test')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};


// Questions Management Dialog
const QuestionsDialog = ({ isOpen, onClose, megaTest }: { isOpen: boolean; onClose: () => void; megaTest: MegaTest | null; }) => {
    const queryClient = useQueryClient();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [questionForm, setQuestionForm] = useState({ text: '', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }] as QuizOption[], correctAnswer: '' });
    const [bulkQuestionsText, setBulkQuestionsText] = useState('');
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    const { isFetching: isLoadingQuestions } = useQuery({
        queryKey: ['mega-test-questions', megaTest?.id],
        queryFn: () => getMegaTestById(megaTest!.id).then(data => data.questions || []),
        onSuccess: setQuestions,
        enabled: isOpen && !!megaTest,
    });
    
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MegaTest> }) => updateMegaTest(id, data),
        onSuccess: () => {
            toast.success('Questions updated successfully');
            queryClient.invalidateQueries({queryKey: ['mega-tests']}); // Invalidate main list to update question count
            onClose();
        },
        onError: () => toast.error('Failed to update questions'),
    });

    const handleAddQuestion = () => {
        const newQuestion: QuizQuestion = { id: uuidv4(), text: questionForm.text, options: questionForm.options, correctAnswer: questionForm.correctAnswer };
        setQuestions(prev => [...prev, newQuestion]);
        setQuestionForm({ text: '', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }], correctAnswer: '' });
    };
    
    const handleUpdateOption = (optionId: string, text: string) => setQuestionForm(prev => ({ ...prev, options: prev.options.map(opt => opt.id === optionId ? { ...opt, text } : opt) }));
    const handleRemoveQuestion = (questionId: string) => setQuestions(prev => prev.filter(q => q.id !== questionId));

    const handleBulkImport = () => {
        try {
            const questionBlocks = bulkQuestionsText.split('\n\n').filter(block => block.trim());
            const newQuestions = questionBlocks.map((block, i) => {
                const lines = block.trim().split('\n');
                const optionsLineIndex = lines.findIndex(line => line.includes('|'));
                if (optionsLineIndex === -1) throw new Error(`Invalid format in question ${i + 1}. Missing options line.`);
                const questionText = lines.slice(0, optionsLineIndex).join('\n').trim();
                const optionsLine = lines[optionsLineIndex];
                const lastPipeIndex = optionsLine.lastIndexOf('|');
                const questionPart = optionsLine.substring(0, lastPipeIndex);
                const parts = questionPart.split('|');
                const correctAnswer = optionsLine.substring(lastPipeIndex + 1).trim().toLowerCase();
                const options = parts.slice(1);

                if (options.length !== 4) throw new Error(`Invalid format in question ${i + 1}. Must have 4 options.`);
                if (!['a', 'b', 'c', 'd'].includes(correctAnswer)) throw new Error(`Invalid correct answer in question ${i + 1}. Must be a, b, c, or d`);

                return {
                    id: uuidv4(), text: questionText, correctAnswer: correctAnswer,
                    options: [
                        { id: 'a', text: options[0].trim() }, { id: 'b', text: options[1].trim() },
                        { id: 'c', text: options[2].trim() }, { id: 'd', text: options[3].trim() }
                    ],
                };
            });

            if (newQuestions.length > 0) {
                setQuestions(prev => [...prev, ...newQuestions]);
                setBulkQuestionsText('');
                setIsBulkImportOpen(false);
                toast.success(`Successfully imported ${newQuestions.length} questions`);
            } else {
                toast.error('No valid questions found');
            }
        } catch (error: any) {
            console.error('Error importing questions:', error);
            toast.error(error.message || 'Failed to import questions. Check format.');
        }
    };
    
    const handleSaveChanges = () => {
        if (megaTest) {
            updateMutation.mutate({ id: megaTest.id, data: { questions } });
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
                        <DialogTitle>Manage Questions - {megaTest?.title}</DialogTitle>
                    </DialogHeader>
                    {isLoadingQuestions ? (<p>Loading questions...</p>) : (
                    <div className="space-y-6 pb-4">
                        {/* Add Question Form */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><h3 className="font-medium">Add New Question</h3><Button variant="outline" onClick={() => setIsBulkImportOpen(true)}><Upload className="h-4 w-4 mr-2" />Bulk Import</Button></div>
                            <div><Label htmlFor="questionText">Question Text</Label><Textarea id="questionText" value={questionForm.text} onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })} placeholder="Enter your question" /></div>
                            <div><Label>Options</Label><div className="space-y-2">{questionForm.options.map((option) => (<div key={option.id} className="flex gap-2"><Input value={option.text} onChange={(e) => handleUpdateOption(option.id, e.target.value)} placeholder="Enter option text" /></div>))}</div></div>
                            <div>
                                <Label htmlFor="correctAnswer">Correct Answer</Label>
                                <div className="grid grid-cols-2 gap-2">{questionForm.options.map((option) => (<Button key={option.id} type="button" variant={questionForm.correctAnswer === option.id ? "default" : "outline"} onClick={() => setQuestionForm({ ...questionForm, correctAnswer: option.id })} className="w-full">Option {option.id.toUpperCase()}</Button>))}</div>
                            </div>
                            <Button type="button" onClick={handleAddQuestion} disabled={!questionForm.text || !questionForm.correctAnswer}>Add Question</Button>
                        </div>

                        {/* Existing Questions List */}
                        <div className="space-y-4"><h3 className="font-medium">Existing Questions ({questions.length})</h3>{questions.map((question) => (
                            <Card key={question.id}>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="prose prose-sm max-w-none w-full">
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 space-y-2">
                                                    {question.text.split('\n').map((line, index) => <p key={index} className="mb-1">{line}</p>)}
                                                </div>
                                                <Button variant="destructive" size="sm" onClick={() => handleRemoveQuestion(question.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                            <div className="grid gap-2 mt-4">{question.options.map((option) => (<div key={option.id} className={`p-3 rounded-lg border ${option.id === question.correctAnswer ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-gray-700'}`}><span className="font-medium text-sm">{option.id.toUpperCase()}.</span> <span className="text-sm">{option.text}</span></div>))}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}</div>
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 sticky bottom-0 bg-background pt-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSaveChanges} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Button></div>
                    </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Bulk Import Dialog */}
            <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader><DialogTitle>Bulk Import Questions</DialogTitle></DialogHeader>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        <div>
                            <Label>Questions Format</Label>
                            <div className="text-sm text-gray-500 mb-2 p-2 bg-muted rounded-md">Each question is separated by a blank line.<br />Format: `Question text | Option A | Option B | Option C | Option D | correct_option_id`</div>
                            <Textarea value={bulkQuestionsText} onChange={(e) => setBulkQuestionsText(e.target.value)} placeholder="Enter questions here..." className="h-[300px] font-mono resize-none" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t mt-4"><Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>Cancel</Button><Button onClick={handleBulkImport}>Import Questions</Button></div>
                </DialogContent>
            </Dialog>
        </>
    );
};


// Leaderboard Management Dialog
const LeaderboardDialog = ({ isOpen, onClose, megaTest }: { isOpen: boolean; onClose: () => void; megaTest: MegaTest | null }) => {
    const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightDuplicateIPs, setHighlightDuplicateIPs] = useState(false);
    const [highlightDuplicateDeviceIDs, setHighlightDuplicateDeviceIDs] = useState(false);

    const fetchLeaderboardData = useCallback(async () => {
        if (!megaTest) return;
        setIsLoading(true);
        try {
            const [leaderboard, participants] = await Promise.all([
                getMegaTestLeaderboard(megaTest.id),
                getMegaTestParticipants(megaTest.id)
            ]);
            const participantsMap = new Map(participants.map((p: any) => [p.userId, p]));
            const merged = leaderboard.map(entry => {
                const participant = participantsMap.get(entry.userId);
                return { ...entry, ipAddress: participant?.ipAddress || 'N/A', username: participant?.username || '', email: participant?.email || '', deviceId: participant?.deviceId || 'N/A' };
            });
            setLeaderboardEntries(merged);
        } catch (error) {
            console.error("Failed to fetch leaderboard data", error);
            toast.error("Failed to fetch leaderboard data");
        } finally {
            setIsLoading(false);
        }
    }, [megaTest]);

    useEffect(() => {
        if (isOpen) {
            fetchLeaderboardData();
        }
    }, [isOpen, fetchLeaderboardData]);

    const filteredAndMemoizedEntries = useMemo(() => {
        if (!highlightDuplicateIPs && !highlightDuplicateDeviceIDs) {
            return leaderboardEntries;
        }
        const ipCount: Record<string, number> = {};
        const deviceIdCount: Record<string, number> = {};
        if (highlightDuplicateIPs || highlightDuplicateDeviceIDs) {
            leaderboardEntries.forEach(entry => {
                if (entry.ipAddress && entry.ipAddress !== 'N/A') ipCount[entry.ipAddress] = (ipCount[entry.ipAddress] || 0) + 1;
                if (entry.deviceId && entry.deviceId !== 'N/A') deviceIdCount[entry.deviceId] = (deviceIdCount[entry.deviceId] || 0) + 1;
            });
        }
        return leaderboardEntries.filter(entry => {
            const hasDuplicateIP = highlightDuplicateIPs && entry.ipAddress && entry.ipAddress !== 'N/A' && ipCount[entry.ipAddress] > 1;
            const hasDuplicateDeviceID = highlightDuplicateDeviceIDs && entry.deviceId && entry.deviceId !== 'N/A' && deviceIdCount[entry.deviceId] > 1;
            return hasDuplicateIP || hasDuplicateDeviceID;
        });
    }, [leaderboardEntries, highlightDuplicateIPs, highlightDuplicateDeviceIDs]);


    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
                <DialogHeader className="sticky top-0 bg-background z-10 pb-4"><DialogTitle>Manage Leaderboard - {megaTest?.title}</DialogTitle></DialogHeader>
                 <div className="flex items-center mb-4 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" checked={highlightDuplicateIPs} onChange={e => setHighlightDuplicateIPs(e.target.checked)} className="accent-amber-500"/>Highlight Same IP</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" checked={highlightDuplicateDeviceIDs} onChange={e => setHighlightDuplicateDeviceIDs(e.target.checked)} className="accent-amber-500"/>Highlight Same Device ID</label>
                    <Button type="button" size="sm" variant="outline" onClick={() => exportToCSV(`leaderboard-${megaTest?.title || 'megatest'}.csv`, filteredAndMemoizedEntries, ['Rank', 'User ID', 'Username', 'Email', 'IP Address', 'Score', 'Completion Time', 'Device ID'], ['rank', 'userId', 'username', 'email', 'ipAddress', 'score', 'completionTime', 'deviceId'])}>Export to CSV</Button>
                </div>
                <div className="flex-1 min-h-0">
                    <h3 className="font-semibold mb-2">Current Leaderboard</h3>
                    {isLoading ? <div>Loading...</div> : (
                        <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                             {filteredAndMemoizedEntries.length === 0 ? <div className="text-muted-foreground">No entries yet</div> : (
                                <table className="min-w-full">
                                    <thead className="text-xs uppercase text-gray-500"><tr><th className="p-2 text-left">Rank</th><th className="p-2 text-left">User</th><th className="p-2 text-left">IP</th><th className="p-2 text-left">Device ID</th><th className="p-2 text-center">Score</th><th className="p-2 text-center">Time(s)</th></tr></thead>
                                    <tbody>{filteredAndMemoizedEntries.map(entry => <tr key={entry.userId} className="border-t hover:bg-muted/50 text-sm"><td className="p-2 font-medium">#{entry.rank}</td><td className="p-2"><div>{entry.username} ({entry.email})</div><div className="text-xs text-muted-foreground">{entry.userId}</div></td><td className="p-2">{entry.ipAddress}</td><td className="p-2 truncate max-w-xs">{entry.deviceId}</td><td className="p-2 text-center">{entry.score}</td><td className="p-2 text-center">{entry.completionTime}s</td></tr>)}</tbody>
                                </table>
                             )}
                        </ScrollArea>
                    )}
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t"><Button variant="outline" onClick={onClose}>Close</Button></div>
            </DialogContent>
        </Dialog>
    );
};


// Participants List Dialog
const ParticipantsDialog = ({ isOpen, onClose, megaTest }: { isOpen: boolean; onClose: () => void; megaTest: MegaTest | null }) => {
    const [participants, setParticipants] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightDuplicateIPs, setHighlightDuplicateIPs] = useState(false);
    const [highlightDuplicateDeviceIDs, setHighlightDuplicateDeviceIDs] = useState(false);

    useEffect(() => {
        if (isOpen && megaTest) {
            setIsLoading(true);
            getMegaTestParticipants(megaTest.id)
                .then(setParticipants)
                .catch(() => setParticipants([]))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, megaTest]);

    const filteredAndMemoizedParticipants = useMemo(() => {
        if (!highlightDuplicateIPs && !highlightDuplicateDeviceIDs) {
            return participants;
        }
        const ipCount: Record<string, number> = {};
        const deviceIdCount: Record<string, number> = {};
        if (highlightDuplicateIPs || highlightDuplicateDeviceIDs) {
            participants.forEach(p => {
                if (p.ipAddress && p.ipAddress !== 'N/A') ipCount[p.ipAddress] = (ipCount[p.ipAddress] || 0) + 1;
                if (p.deviceId && p.deviceId !== 'N/A') deviceIdCount[p.deviceId] = (deviceIdCount[p.deviceId] || 0) + 1;
            });
        }
        return participants.filter(p => {
            const hasDuplicateIP = highlightDuplicateIPs && p.ipAddress && p.ipAddress !== 'N/A' && ipCount[p.ipAddress] > 1;
            const hasDuplicateDeviceID = highlightDuplicateDeviceIDs && p.deviceId && p.deviceId !== 'N/A' && deviceIdCount[p.deviceId] > 1;
            return hasDuplicateIP || hasDuplicateDeviceID;
        });
    }, [participants, highlightDuplicateIPs, highlightDuplicateDeviceIDs]);


    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="sticky top-0 bg-background z-10 pb-4"><DialogTitle>Participants for {megaTest?.title}</DialogTitle></DialogHeader>
                <div className="flex items-center mb-4 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" checked={highlightDuplicateIPs} onChange={e => setHighlightDuplicateIPs(e.target.checked)} className="accent-amber-500"/>Highlight Same IP</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" checked={highlightDuplicateDeviceIDs} onChange={e => setHighlightDuplicateDeviceIDs(e.target.checked)} className="accent-amber-500"/>Highlight Same Device ID</label>
                    <Button type="button" size="sm" variant="outline" onClick={() => exportToCSV(`participants-${megaTest?.title || 'megatest'}.csv`, filteredAndMemoizedParticipants.map(p => ({ ...p, registeredAt: p.registeredAt?.toDate() })), ['User ID', 'Username', 'Email', 'Registered At', 'IP Address', 'Device ID'], ['userId', 'username', 'email', 'registeredAt', 'ipAddress', 'deviceId'])}>Export to CSV</Button>
                </div>
                {isLoading ? <p>Loading participants...</p> : (
                <ScrollArea className="h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered At</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device ID</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">{filteredAndMemoizedParticipants.map(p => (<tr key={p.userId}><td className="px-6 py-4 whitespace-nowrap text-sm"><div className="font-medium text-gray-900">{p.username}</div><div className="text-gray-500">{p.email}</div></td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.registeredAt ? format(p.registeredAt.toDate(), 'MMM d, yyyy h:mm a') : 'N/A'}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.ipAddress}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.deviceId}</td></tr>))}</tbody>
                    </table>
                </ScrollArea>
                )}
                <div className="flex justify-end mt-4"><Button variant="outline" onClick={onClose}>Close</Button></div>
            </DialogContent>
        </Dialog>
    );
}

// #endregion

const MegaTestManager = () => {
    const queryClient = useQueryClient();
    const [dialogs, setDialogs] = useState({
        form: { isOpen: false, megaTest: null as MegaTest | null },
        questions: { isOpen: false, megaTest: null as MegaTest | null },
        leaderboard: { isOpen: false, megaTest: null as MegaTest | null },
        participants: { isOpen: false, megaTest: null as MegaTest | null },
    });

    const { data: megaTests, isLoading } = useQuery({ queryKey: ['mega-tests'], queryFn: getMegaTests });

    const { data: participantCounts } = useQuery({
        queryKey: ['mega-tests-participants', megaTests],
        queryFn: async () => {
            if (!megaTests) return {};
            const counts = await Promise.all(
                megaTests.map(test => getMegaTestParticipantCount(test.id).then(count => ({ megaTestId: test.id, count })))
            );
            return counts.reduce((acc, { megaTestId, count }) => ({ ...acc, [megaTestId]: count }), {});
        },
        enabled: !!megaTests,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMegaTest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mega-tests'] });
            toast.success('Mega test deleted successfully');
        },
        onError: () => toast.error('Failed to delete mega test'),
    });

    const handleDelete = useCallback((id: string) => {
        if (window.confirm('Are you sure you want to delete this mega test?')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const openDialog = useCallback((dialog: keyof typeof dialogs, megaTest: MegaTest | null = null) => {
        setDialogs(prev => ({ ...prev, [dialog]: { isOpen: true, megaTest }}));
    }, []);

    const closeDialog = useCallback((dialog: keyof typeof dialogs) => {
        setDialogs(prev => ({ ...prev, [dialog]: { isOpen: false, megaTest: null }}));
    }, []);

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center"><Trophy className="h-6 w-6 mr-2 text-amber-500" />Mega Test Manager</h1>
                <Button onClick={() => openDialog('form')}><Plus className="h-4 w-4 mr-2" />Create Mega Test</Button>
            </div>

            <div className="grid gap-4">
                {megaTests?.map((megaTest) => (
                    <MegaTestCard
                        key={megaTest.id}
                        megaTest={megaTest}
                        participantCount={participantCounts?.[megaTest.id] || 0}
                        onEdit={() => openDialog('form', megaTest)}
                        onDelete={handleDelete}
                        onManageQuestions={() => openDialog('questions', megaTest)}
                        onManageLeaderboard={() => openDialog('leaderboard', megaTest)}
                        onViewParticipants={() => openDialog('participants', megaTest)}
                    />
                ))}
            </div>

            {/* Dialog Renderings */}
            <MegaTestFormDialog isOpen={dialogs.form.isOpen} onClose={() => closeDialog('form')} megaTest={dialogs.form.megaTest} />
            <QuestionsDialog isOpen={dialogs.questions.isOpen} onClose={() => closeDialog('questions')} megaTest={dialogs.questions.megaTest} />
            <LeaderboardDialog isOpen={dialogs.leaderboard.isOpen} onClose={() => closeDialog('leaderboard')} megaTest={dialogs.leaderboard.megaTest} />
            <ParticipantsDialog isOpen={dialogs.participants.isOpen} onClose={() => closeDialog('participants')} megaTest={dialogs.participants.megaTest} />
        </div>
    );
};

export default MegaTestManager;
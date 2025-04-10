import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMegaTests, 
  createMegaTest, 
  updateMegaTest, 
  deleteMegaTest,
  getMegaTestParticipantCount,
  MegaTest,
  QuizQuestion,
  QuizOption
} from '../../services/firebase/quiz';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Clock, Trophy, ListChecks, CreditCard, Users, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const MegaTestManager = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isQuestionsDialogOpen, setIsQuestionsDialogOpen] = useState(false);
  const [selectedMegaTest, setSelectedMegaTest] = useState<MegaTest | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    questions: [] as QuizQuestion[],
    registrationStartTime: '',
    registrationEndTime: '',
    testStartTime: '',
    testEndTime: '',
    resultTime: '',
    entryFee: 0,
    prizes: [] as { rank: number; prize: string }[],
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

  const createMutation = useMutation({
    mutationFn: createMegaTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mega-tests'] });
      setIsCreateDialogOpen(false);
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
        questions: [],
        registrationStartTime: '',
        registrationEndTime: '',
        testStartTime: '',
        testEndTime: '',
        resultTime: '',
        entryFee: 0,
        prizes: [],
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      registrationStartTime: new Date(formData.registrationStartTime),
      registrationEndTime: new Date(formData.registrationEndTime),
      testStartTime: new Date(formData.testStartTime),
      testEndTime: new Date(formData.testEndTime),
      resultTime: new Date(formData.resultTime),
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMegaTest) return;
    
    updateMutation.mutate({
      id: selectedMegaTest.id,
      data: {
        ...formData,
        registrationStartTime: new Date(formData.registrationStartTime),
        registrationEndTime: new Date(formData.registrationEndTime),
        testStartTime: new Date(formData.testStartTime),
        testEndTime: new Date(formData.testEndTime),
        resultTime: new Date(formData.resultTime),
      },
    });
  };

  const handleEdit = (megaTest: MegaTest) => {
    setSelectedMegaTest(megaTest);
    setFormData({
      title: megaTest.title,
      description: megaTest.description,
      questions: megaTest.questions,
      registrationStartTime: format(megaTest.registrationStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      registrationEndTime: format(megaTest.registrationEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      testStartTime: format(megaTest.testStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      testEndTime: format(megaTest.testEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      resultTime: format(megaTest.resultTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      entryFee: megaTest.entryFee,
      prizes: [],
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this mega test?')) {
      deleteMutation.mutate(id);
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

  const handleQuestionsDialogOpen = (megaTest: MegaTest) => {
    setSelectedMegaTest(megaTest);
    setFormData({
      title: megaTest.title,
      description: megaTest.description,
      questions: megaTest.questions,
      registrationStartTime: format(megaTest.registrationStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      registrationEndTime: format(megaTest.registrationEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      testStartTime: format(megaTest.testStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      testEndTime: format(megaTest.testEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      resultTime: format(megaTest.resultTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      entryFee: megaTest.entryFee,
      prizes: [],
    });
    setIsQuestionsDialogOpen(true);
  };

  const handleAddWinner = () => {
    setFormData({
      ...formData,
      prizes: [
        ...formData.prizes,
        { rank: formData.prizes.length + 1, prize: '' }
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
    setFormData({
      ...formData,
      prizes: formData.prizes.map((prize, i) => 
        i === index ? { ...prize, prize: value } : prize
      ),
    });
  };

  const handleBulkImport = () => {
    try {
      const lines = bulkQuestionsText.split('\n').filter(line => line.trim());
      const newQuestions: QuizQuestion[] = [];
      
      for (const line of lines) {
        const parts = line.split('|').map(part => part.trim());
        if (parts.length !== 6) continue; // Skip invalid lines
        
        const [questionText, optionA, optionB, optionC, optionD, correctAnswerLetter] = parts;
        
        // Validate correct answer letter
        const validAnswerLetters = ['a', 'b', 'c', 'd'];
        if (!validAnswerLetters.includes(correctAnswerLetter.toLowerCase())) continue;
        
        const options = [
          { id: 'a', text: optionA },
          { id: 'b', text: optionB },
          { id: 'c', text: optionC },
          { id: 'd', text: optionD }
        ];
        
        if (questionText && options.every(opt => opt.text) && correctAnswerLetter) {
          newQuestions.push({
            id: uuidv4(),
            text: questionText,
            options,
            correctAnswer: correctAnswerLetter.toLowerCase()
          });
        }
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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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
              <div className="space-y-4">
                <Label>Prizes</Label>
                <div className="space-y-4">
                  {formData.prizes.map((prize, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-bold">
                        {prize.rank}
                      </div>
                      <Input
                        value={prize.prize}
                        onChange={(e) => handleUpdateWinnerPrize(index, e.target.value)}
                        placeholder={`Enter prize for ${prize.rank}${prize.rank === 1 ? 'st' : prize.rank === 2 ? 'nd' : prize.rank === 3 ? 'rd' : 'th'} place`}
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
                <CardTitle>{megaTest.title}</CardTitle>
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
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(megaTest.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
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
                  <span>{megaTest.totalQuestions} Questions</span>
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
                      <div className="space-y-2">
                        <p className="font-medium">{question.text}</p>
                        <div className="space-y-1">
                          {question.options.map((option) => (
                            <div
                              key={option.id}
                              className={`text-sm ${
                                option.text === question.correctAnswer
                                  ? 'text-green-600 font-medium'
                                  : 'text-gray-600'
                              }`}
                            >
                              • {option.text}
                            </div>
                          ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Questions Format</Label>
              <p className="text-sm text-gray-500 mb-2">
                Enter questions in the following format (one question per line):<br />
                Question text | Option A | Option B | Option C | Option D | a<br />
                <br />
                Example:<br />
                What is the capital of France? | London | Berlin | Paris | Madrid | a
              </p>
              <Textarea
                value={bulkQuestionsText}
                onChange={(e) => setBulkQuestionsText(e.target.value)}
                placeholder="Enter questions here..."
                className="h-[300px] font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkImport}>
                Import Questions
              </Button>
            </div>
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
            <div className="space-y-4">
              <Label>Prizes</Label>
              <div className="space-y-4">
                {formData.prizes.map((prize, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-bold">
                      {prize.rank}
                    </div>
                    <Input
                      value={prize.prize}
                      onChange={(e) => handleUpdateWinnerPrize(index, e.target.value)}
                      placeholder={`Enter prize for ${prize.rank}${prize.rank === 1 ? 'st' : prize.rank === 2 ? 'nd' : prize.rank === 3 ? 'rd' : 'th'} place`}
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
    </div>
  );
};

export default MegaTestManager; 
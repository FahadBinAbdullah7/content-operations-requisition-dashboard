
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { getFormQuestions, addFormQuestion, updateFormQuestion, deleteFormQuestion } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import type { FormQuestion } from '@/lib/mock-data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';

export default function AdminPage() {
  const { user } = useAuth();
  
  const [teams] = useState<string[]>(["Marketing", "Media", "EPD", "Content"]);
  const [selectedTeam, setSelectedTeam] = useState('');
  
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<FormQuestion['questionType']>('Text');
  const [isQuestionRequired, setIsQuestionRequired] = useState(false);
  const [checkboxOptions, setCheckboxOptions] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
      if (teams.length > 0) {
        setSelectedTeam(teams[0]);
      }
  }, []);


  const fetchQuestions = async (team: string) => {
    if (!team) {
      setFormQuestions([]);
      return;
    };
    setIsLoading(true);
    setError('');
    try {
      const questions = await getFormQuestions(team);
      setFormQuestions(questions);
    } catch (err) {
      console.error(err);
      setError("Failed to load questions from Google Sheet.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTeam) {
      fetchQuestions(selectedTeam);
    }
  }, [selectedTeam]);
  
  const handleOpenDialog = (question: FormQuestion | null = null) => {
    setEditingQuestion(question);
    if (question) {
        setNewQuestionText(question.questionText.replace(/\*$/, '').replace(/\s\(.*\)/, ''));
        setNewQuestionType(question.questionType);
        setIsQuestionRequired(question.questionText.endsWith('*'));
        setCheckboxOptions(question.options?.join(', ') || '');
    } else {
        setNewQuestionText('');
        setNewQuestionType('Text');
        setIsQuestionRequired(false);
        setCheckboxOptions('');
    }
    setIsDialogOpen(true);
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let finalQuestionText = newQuestionText;
    
    let typeHint = '';
    if (newQuestionType === 'Select') typeHint = ' (Select)';
    if (newQuestionType === 'Checkbox') {
      const options = checkboxOptions.split(',').map(o => o.trim()).filter(Boolean);
      typeHint = ` (Checkbox: ${options.join(';')})`;
    }
    finalQuestionText += typeHint;
    
    if (isQuestionRequired) {
        finalQuestionText += '*';
    }
    
    let result;
    if (editingQuestion) {
      result = await updateFormQuestion(selectedTeam, editingQuestion.questionText, finalQuestionText);
    } else {
      result = await addFormQuestion(selectedTeam, finalQuestionText);
    }

    if (result.success) {
      toast({
        title: 'Success!',
        description: `Question has been ${editingQuestion ? 'updated' : 'added'}.`,
      });
      setIsDialogOpen(false);
      await fetchQuestions(selectedTeam);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'An unknown error occurred.',
      });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (questionText: string) => {
    const result = await deleteFormQuestion(selectedTeam, questionText);
     if (result.success) {
      toast({
        title: 'Success!',
        description: 'Question has been deleted.',
      });
      await fetchQuestions(selectedTeam);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to delete question.',
      });
    }
  }
  
  const canManage = user?.role === 'admin';

  return (
    <>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Manage Form Questions</h1>
           {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} disabled={!selectedTeam}>
                  <PlusCircle className="mr-2" />
                  Add New Question
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? 'Edit' : 'Add New'} Form Question for {selectedTeam}</DialogTitle>
                  <DialogDescription>
                    This will {editingQuestion ? 'modify an entry in' : 'add a new row to'} the 'FormQuestions' sheet in your Google Sheet.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleFormSubmit}>
                  <div className="py-4 space-y-4">
                    <div>
                      <Label htmlFor="new-question-text">Question Text</Label>
                      <Input
                        id="new-question-text"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="e.g., Contact Number"
                      />
                    </div>
                      <div>
                      <Label htmlFor="new-question-type">Question Type</Label>
                        <Select value={newQuestionType} onValueChange={(value) => setNewQuestionType(value as FormQuestion['questionType'])}>
                          <SelectTrigger id="new-question-type">
                              <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Text">Text</SelectItem>
                              <SelectItem value="Textarea">Textarea</SelectItem>
                              <SelectItem value="Select">Select (Options managed in sheet)</SelectItem>
                              <SelectItem value="Checkbox">Checkbox (Options defined here)</SelectItem>
                              <SelectItem value="Date">Date</SelectItem>
                              <SelectItem value="Url">URL</SelectItem>
                          </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">For 'Select', add options in a new sheet named after the question.</p>
                    </div>
                      {newQuestionType === 'Checkbox' && (
                        <div>
                          <Label htmlFor="checkbox-options">Checkbox Options</Label>
                          <Textarea 
                              id="checkbox-options"
                              value={checkboxOptions}
                              onChange={(e) => setCheckboxOptions(e.target.value)}
                              placeholder="Enter comma-separated options, e.g., Option A, Option B"
                          />
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                          <Checkbox id="is-required" checked={isQuestionRequired} onCheckedChange={(checked) => setIsQuestionRequired(Boolean(checked))} />
                          <label
                              htmlFor="is-required"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                              Make this question required
                          </label>
                      </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingQuestion ? 'Save Changes' : 'Add Question'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
           )}
        </div>

        <Card className="mb-6">
            <CardContent className="p-4">
                 <Label htmlFor="team-select">Select Team to Manage Questions</Label>
                 <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger id="team-select">
                        <SelectValue placeholder="Select a team..." />
                    </SelectTrigger>
                    <SelectContent>
                        {teams.map(team => (
                            <SelectItem key={team} value={team}>{team}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions for {selectedTeam || "..."}</CardTitle>
            <CardDescription>
                These questions are managed in the 'FormQuestions' sheet of your Google Sheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-8"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Loading questions...</div>
            ) : error ? (
                <p className="text-destructive text-center py-8">{error}</p>
            ) : !selectedTeam ? (
                <p className="text-muted-foreground text-center py-8">Please select a team to see its questions.</p>
            ) : formQuestions.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">No questions found for this team. Add one to get started.</p>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question Text</TableHead>
                  <TableHead>Question Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium">{question.questionText.replace(/\*$/, '').replace(/\s\(.*\)/, '')}</TableCell>
                    <TableCell>{question.questionType}</TableCell>
                    <TableCell>{question.questionText.endsWith('*') ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                        {canManage ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(question)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the question from the 'FormQuestions' sheet.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(question.questionText)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                            <span className="text-xs text-muted-foreground">No actions</span>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    

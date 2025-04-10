import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const TermsAndConditionsManager = () => {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { data: termsAndConditions, isLoading } = useQuery({
    queryKey: ['admin-terms-and-conditions'],
    queryFn: async () => {
      const docRef = doc(db, 'content', 'terms-and-conditions');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return { content: '' };
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const docRef = doc(db, 'content', 'terms-and-conditions');
      await setDoc(docRef, { content: newContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-and-conditions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-terms-and-conditions'] });
      toast.success('Terms and conditions updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update terms and conditions');
      console.error('Error updating terms and conditions:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(content);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms & Conditions Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Terms & Conditions Content
            </label>
            <Textarea
              id="content"
              value={content || termsAndConditions?.content || ''}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] font-mono"
              placeholder="Enter terms and conditions content (HTML supported)"
            />
          </div>
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Terms & Conditions
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 
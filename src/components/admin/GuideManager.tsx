import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const GuideManager = () => {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { data: guideContent, isLoading } = useQuery({
    queryKey: ['admin-guide'],
    queryFn: async () => {
      const docRef = doc(db, 'content', 'guide');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return { content: '' };
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const docRef = doc(db, 'content', 'guide');
      await setDoc(docRef, { content: newContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide'] });
      queryClient.invalidateQueries({ queryKey: ['admin-guide'] });
      toast.success('Guide content updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update guide content');
      console.error('Error updating guide content:', error);
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
        <CardTitle>Guide Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Guide Content
            </label>
            <Textarea
              id="content"
              value={content || guideContent?.content || ''}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] font-mono"
              placeholder="Enter guide content (HTML supported)"
            />
          </div>
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Guide
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GuideManager; 
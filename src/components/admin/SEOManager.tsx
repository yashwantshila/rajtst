import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const SEOManager = () => {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    seoTitle: '',
    seoDescription: '',
    seoKeywords: ''
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-seo-settings'],
    queryFn: async () => {
      const docRef = doc(db, 'config', 'settings');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as {
          seoTitle?: string;
          seoDescription?: string;
          seoKeywords?: string;
        };
      }
      return { seoTitle: '', seoDescription: '', seoKeywords: '' };
    }
  });

  useEffect(() => {
    if (settings) {
      setFormState({
        seoTitle: settings.seoTitle || '',
        seoDescription: settings.seoDescription || '',
        seoKeywords: settings.seoKeywords || ''
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formState) => {
      const docRef = doc(db, 'config', 'settings');
      await setDoc(docRef, data, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seo-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('SEO settings updated');
    },
    onError: (err) => {
      console.error('Error updating SEO settings:', err);
      toast.error('Failed to update SEO settings');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formState);
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
        <CardTitle>SEO Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="seoTitle" className="text-sm font-medium">
              Site Title
            </label>
            <Input
              id="seoTitle"
              name="seoTitle"
              value={formState.seoTitle}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="seoDescription" className="text-sm font-medium">
              Meta Description
            </label>
            <Textarea
              id="seoDescription"
              name="seoDescription"
              value={formState.seoDescription}
              onChange={handleChange}
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="seoKeywords" className="text-sm font-medium">
              Keywords
            </label>
            <Input
              id="seoKeywords"
              name="seoKeywords"
              value={formState.seoKeywords}
              onChange={handleChange}
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update SEO Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SEOManager;


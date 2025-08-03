import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { PageSeo } from '@/services/api/settings';

interface PageForm extends PageSeo {
  path: string;
}

const SEOManager = () => {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    seoTitle: '',
    seoDescription: '',
    seoKeywords: ''
  });
  const [pages, setPages] = useState<PageForm[]>([]);

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
          pageSeo?: Record<string, PageSeo>;
        };
      }
      return { seoTitle: '', seoDescription: '', seoKeywords: '', pageSeo: {} };
    }
  });

  useEffect(() => {
    if (settings) {
      setFormState({
        seoTitle: settings.seoTitle || '',
        seoDescription: settings.seoDescription || '',
        seoKeywords: settings.seoKeywords || ''
      });
      const pageEntries = settings.pageSeo
        ? Object.entries(settings.pageSeo).map(([path, data]) => ({
            path,
            title: data.title || '',
            description: data.description || '',
            keywords: data.keywords || '',
            canonical: data.canonical || ''
          }))
        : [];
      setPages(pageEntries);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (payload: {
      seoTitle: string;
      seoDescription: string;
      seoKeywords: string;
      pageSeo: Record<string, PageSeo>;
    }) => {
      const docRef = doc(db, 'config', 'settings');
      await setDoc(docRef, payload, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seo-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('SEO settings updated');
    },
    onError: err => {
      console.error('Error updating SEO settings:', err);
      toast.error('Failed to update SEO settings');
    }
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (
    index: number,
    field: keyof PageForm,
    value: string
  ) => {
    setPages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addPage = () => {
    setPages(prev => [
      ...prev,
      { path: '', title: '', description: '', keywords: '', canonical: '' }
    ]);
  };

  const removePage = (index: number) => {
    setPages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageSeo = pages.reduce<Record<string, PageSeo>>((acc, page) => {
      if (page.path) {
        acc[page.path] = {
          title: page.title || undefined,
          description: page.description || undefined,
          keywords: page.keywords || undefined,
          canonical: page.canonical || undefined
        };
      }
      return acc;
    }, {});
    mutation.mutate({ ...formState, pageSeo });
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
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Page Metadata</h3>
              <Button type="button" onClick={addPage} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {pages.map((page, idx) => (
              <div key={idx} className="space-y-2 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Path</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePage(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={page.path}
                  onChange={e => handlePageChange(idx, 'path', e.target.value)}
                  placeholder="/example"
                />
                <Input
                  value={page.title}
                  onChange={e => handlePageChange(idx, 'title', e.target.value)}
                  placeholder="Title"
                />
                <Textarea
                  value={page.description}
                  onChange={e => handlePageChange(idx, 'description', e.target.value)}
                  placeholder="Description"
                />
                <Input
                  value={page.keywords}
                  onChange={e => handlePageChange(idx, 'keywords', e.target.value)}
                  placeholder="Keywords"
                />
                <Input
                  value={page.canonical}
                  onChange={e => handlePageChange(idx, 'canonical', e.target.value)}
                  placeholder="Canonical URL (optional)"
                />
              </div>
            ))}
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


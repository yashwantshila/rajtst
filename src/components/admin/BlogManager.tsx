import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBlogPosts, createBlogPost } from '@/services/api/blog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const BlogManager = () => {
  const [title, setTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: fetchBlogPosts
  });

  const createMutation = useMutation({
    mutationFn: ({ title, pdfUrl }: { title: string; pdfUrl?: string }) => createBlogPost(title, pdfUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Blog post created successfully');
      setTitle('');
      setPdfUrl('');
    },
    onError: () => {
      toast.error('Failed to create blog post');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ title, pdfUrl: pdfUrl || undefined });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blog Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PDF URL (optional)</label>
            <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate Blog
          </Button>
        </form>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            posts?.map((post) => (
              <div key={post.slug} className="border p-4 rounded-md">
                <div className="font-medium">{post.title}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlogManager;

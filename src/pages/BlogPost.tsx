import { useQuery } from '@tanstack/react-query';
import { fetchBlogPost } from '../services/api/blog';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeHtml } from '@/utils/sanitize';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => fetchBlogPost(slug!),
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Blog post not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{data.title}</h1>
          <div className="w-20" />
        </div>
        <div className="prose dark:prose-invert max-w-none [&_p]:text-foreground [&_li]:text-foreground">
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.content) }} />
        </div>
        {data.pdfUrl && (
          <a
            href={data.pdfUrl}
            target="_blank"
            rel="noopener"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            View PDF
          </a>
        )}
      </main>
    </div>
  );
};

export default BlogPost;

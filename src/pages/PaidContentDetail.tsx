import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getPaidContentBySlug, purchaseContent, downloadContent, PaidContent } from '../services/api/paidContent';
import { getUserBalance } from '../services/api/balance';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';

export default function PaidContentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<PaidContent | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) {
      fetchContent(slug);
    }
  }, [slug]);

  const fetchContent = async (slugValue: string) => {
    try {
      const data = await getPaidContentBySlug(slugValue);
      setContent(data);
    } catch (err) {
      console.error('Error fetching content:', err);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: PaidContent) => {
    if (!user) {
      toast.error('Please login to purchase content');
      navigate('/auth');
      return;
    }

    try {
      const balance = await getUserBalance(user.uid);
      if (balance.amount < item.price) {
        toast.error(`Insufficient balance. You need ₹${item.price}. Current balance: ₹${balance.amount}`);
        return;
      }

      await purchaseContent(user.uid, item.id);
      toast.success('Purchase successful!');

      try {
        const blob = await downloadContent(item.id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${item.title}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to download file:', err);
        toast.error('Unable to download file');
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to process purchase');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-600 dark:text-gray-300 mb-4">Content not found.</p>
        <Link to="/paid-content">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>{content.title}</title>
        <meta name="description" content={content.description} />
      </Helmet>
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-start mb-8">
          <Link to="/paid-content">
            <Button variant="outline" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300 dark:hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{content.title}</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 mt-2">
              {content.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.samplePdfUrl && (
              <Button
                variant="outline"
                className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300 dark:hover:bg-gray-700"
                onClick={() => window.open(content.samplePdfUrl!, '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" /> View Sample
              </Button>
            )}
            <Button
              onClick={() => handlePurchase(content)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-300"
            >
              Purchase for ₹{content.price}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


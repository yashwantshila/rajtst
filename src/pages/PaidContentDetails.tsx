import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPaidContents, purchaseContent, downloadContent, PaidContent } from '../services/api/paidContent';
import { useAuth } from '../App';
import { getUserBalance } from '../services/api/balance';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { slugify } from '../utils/slugify';
import Seo from '@/components/Seo';

export default function PaidContentDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<PaidContent | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const list = await getPaidContents();
        const item = list.find(c => slugify(c.title) === slug);
        setContent(item || null);
      } catch (err) {
        console.error('Error fetching paid content:', err);
        toast.error('Failed to load content');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [slug]);

  const handlePurchase = async () => {
    if (!content) return;
    if (!user) {
      toast.error('Please login to purchase content');
      navigate('/auth');
      return;
    }

    try {
      const balance = await getUserBalance(user.uid);
      if (balance.amount < content.price) {
        toast.error(`Insufficient balance. You need ₹${content.price}. Current balance: ₹${balance.amount}`);
        return;
      }

      try {
        await purchaseContent(user.uid, content.id);
      } catch (error: any) {
        console.error('Error processing purchase:', error);
        toast.error(error?.response?.data?.error || 'Failed to process purchase');
        return;
      }

      toast.success('Purchase successful!');

      try {
        const blob = await downloadContent(content.id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${content.title}.pdf`;
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
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <p className="text-gray-600 dark:text-gray-300">Content not found.</p>
        <Link to="/paid-content" className="mt-4">
          <Button>Back to Paid Content</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <Seo title={content.title} description={content.description} canonical={`/paid-content/${slug}`} />
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-start mb-8">
          <Link to="/paid-content">
            <Button variant="outline" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300 dark:hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        {content.thumbnailUrl && (
          <div className="flex justify-center mb-8">
            <img
              src={content.thumbnailUrl}
              alt={content.title}
              className="w-full max-w-2xl rounded-lg shadow-md"
            />
          </div>
        )}
        <Card className="max-w-2xl mx-auto border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
              {content.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              {content.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                <span>PDF Format</span>
              </div>
              <div className="bg-indigo-600 text-white px-2 py-1 rounded-full text-sm font-medium">
                ₹{content.price}
              </div>
            </div>
            {content.samplePdfUrl && (
              <Button
                variant="outline"
                className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300 dark:hover:bg-gray-700"
                onClick={() => window.open(content.samplePdfUrl, '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Sample
              </Button>
            )}
            {content.highlights && content.highlights.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">What's Inside</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-gray-700 dark:text-gray-300">
                  {content.highlights.map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              onClick={handlePurchase}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-300"
            >
              Purchase Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


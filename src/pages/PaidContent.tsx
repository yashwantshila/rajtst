import { useState, useEffect } from 'react';
import { getPaidContents, purchaseContent } from '../services/api/paidContent';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { getUserBalance, updateUserBalance, UserBalance } from '../services/api/balance';
import { DollarSign, FileText, Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface PaidContent {
  id: string;
  title: string;
  description: string;
  price: number;
  pdfUrl: string;
  samplePdfUrl?: string;
  thumbnailUrl?: string;
}

export default function PaidContentPage() { // Renamed component to avoid conflict if 'PaidContent' is also an interface name
  const [contents, setContents] = useState<PaidContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPaidContents();
  }, []);

  const fetchPaidContents = async () => {
    try {
      const list = await getPaidContents();
      setContents(list);
    } catch (error) {
      console.error('Error fetching paid contents:', error);
      toast.error('Failed to load paid contents');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (content: PaidContent) => {
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
        await updateUserBalance(user.uid, -content.price);
        await purchaseContent(user.uid, content.id);
      } catch (error: any) {
        console.error('Error processing purchase:', error);
        toast.error(error?.response?.data?.error || 'Failed to process purchase');
        return;
      }

      toast.success('Purchase successful!');

      window.open(content.pdfUrl, '_blank');
      
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-start mb-8">
          <Link to="/">
            <Button variant="outline" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300 dark:hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Paid Content
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Access high-quality study materials and resources to enhance your learning journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {contents.map((content) => (
            <Card 
              key={content.id} 
              className="group transition-all duration-300 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800 hover:shadow-lg"
            >
              <CardHeader className="space-y-2 pb-2"> {/* Adjusted spacing from reference */}
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-indigo-700 dark:text-indigo-400 line-clamp-2 flex-1">{content.title}</CardTitle>
                  <div className="bg-indigo-600 text-white px-2 py-1 rounded-full text-sm font-medium ml-2 shrink-0"> {/* Added shrink-0 */}
                    ₹{content.price}
                  </div>
                </div>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {content.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" /> 
                    <span>PDF Format</span>
                  </div>
                </div>
                {content.samplePdfUrl && (
                  <Button
                    variant="outline"
                    className="w-full mb-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300 dark:hover:bg-gray-700"
                    onClick={() => window.open(content.samplePdfUrl, '_blank')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Sample
                  </Button>
                )}
                <Button
                  onClick={() => handlePurchase(content)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-300"
                >
                  Purchase Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {contents.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">No Paid Content Available</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Check back later for new paid content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
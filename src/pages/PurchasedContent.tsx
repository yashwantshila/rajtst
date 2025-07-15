import { useState, useEffect } from 'react';
import { getPurchasedContents, downloadPaidContent } from '../services/api/paidContent';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { FileText, ExternalLink, ArrowLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '../components/ui/skeleton';

interface PurchasedContent {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  purchaseDate?: string; 
}

export default function PurchasedContentPage() { // Renamed component
  const [contents, setContents] = useState<PurchasedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPurchasedContents();
    } else {
      setLoading(false);
      setContents([]);
    }
  }, [user]);

  const fetchPurchasedContents = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const data = await getPurchasedContents(user.uid);
      setContents(data);
    } catch (error) {
      console.error('Error fetching purchased contents:', error);
      toast.error('Failed to load purchased contents');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = async (contentId: string) => {
    try {
      const blob = await downloadPaidContent(contentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open content', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-6">
             <Skeleton className="h-10 w-32 bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex items-center justify-between mb-12">
            <div>
              <Skeleton className="h-10 w-64 mb-4 bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-4 w-48 bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2 bg-gray-200 dark:bg-gray-700" />
                  <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2 mb-4 bg-gray-200 dark:bg-gray-700" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-700" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300 dark:hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 md:mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Purchased Content
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
              Access all your purchased study materials and resources
            </p>
          </div>
        </div>

        {contents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {contents.map((content) => (
              <Card 
                key={content.id} 
                className="group transition-all duration-300 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800 hover:shadow-lg flex flex-col"
              >
                <CardHeader className="space-y-2 pb-2"> {/* Adjusted to match reference */}
                  <CardTitle className="text-lg font-semibold text-indigo-700 dark:text-indigo-400 line-clamp-2"> {/* Matched reference style */}
                    {content.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                    {content.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow pt-2"> {/* Added pt-2 for spacing */}
                  <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>PDF Format</span>
                    </div>
                    {content.purchaseDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Purchased on {new Date(content.purchaseDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleViewContent(content.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-300 group-hover:scale-[1.02]"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" /> {/* Added mr-2 for spacing */}
                    View Content
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-6"> {/* Adjusted icon background */}
              <FileText className="h-12 w-12 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">No Purchased Content</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
              You haven't purchased any paid content yet. Browse our collection of premium study materials to enhance your learning journey.
            </p>
            <Link to="/paid-content">
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-300">
                Browse Paid Content
                <ArrowLeft className="h-4 w-4 rotate-180" /> 
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase/config';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { slugify } from '../../utils/slugify';

interface PaidContent {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  pdfUrl: string;
  samplePdfUrl?: string;
  thumbnailUrl?: string;
}

export default function PaidContentManager() {
  const [contents, setContents] = useState<PaidContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    price: '',
    pdfFile: null as File | null,
    samplePdfFile: null as File | null,
    thumbnailFile: null as File | null,
  });

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      const contentsRef = collection(db, 'paidContents');
      const snapshot = await getDocs(contentsRef);
      const contentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaidContent[];
      setContents(contentsList);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('Failed to load contents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'samplePdf' | 'thumbnail') => {
    const file = e.target.files?.[0];
    if (file) {
      setNewContent(prev => ({
        ...prev,
        [type === 'pdf' ? 'pdfFile' : type === 'samplePdf' ? 'samplePdfFile' : 'thumbnailFile']: file
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContent.pdfFile) {
      toast.error('Please upload a PDF file');
      return;
    }

    try {
      // Upload main PDF
      const pdfRef = ref(storage, `paid-content/${Date.now()}_${newContent.pdfFile.name}`);
      await uploadBytes(pdfRef, newContent.pdfFile);
      const pdfUrl = await getDownloadURL(pdfRef);

      // Upload sample PDF if exists
      let samplePdfUrl = '';
      if (newContent.samplePdfFile) {
        const samplePdfRef = ref(storage, `paid-content/samples/${Date.now()}_${newContent.samplePdfFile.name}`);
        await uploadBytes(samplePdfRef, newContent.samplePdfFile);
        samplePdfUrl = await getDownloadURL(samplePdfRef);
      }

      // Upload thumbnail if exists
      let thumbnailUrl = '';
      if (newContent.thumbnailFile) {
        const thumbnailRef = ref(storage, `paid-content/thumbnails/${Date.now()}_${newContent.thumbnailFile.name}`);
        await uploadBytes(thumbnailRef, newContent.thumbnailFile);
        thumbnailUrl = await getDownloadURL(thumbnailRef);
      }

      // Add to Firestore
      const contentData = {
        slug: slugify(newContent.title),
        title: newContent.title,
        description: newContent.description,
        price: Number(newContent.price),
        pdfUrl,
        samplePdfUrl: samplePdfUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'paidContents'), contentData);
      toast.success('Content added successfully');
      
      // Reset form
      setNewContent({
        title: '',
        description: '',
        price: '',
        pdfFile: null,
        samplePdfFile: null,
        thumbnailFile: null,
      });
      
      // Refresh list
      fetchContents();
    } catch (error) {
      console.error('Error adding content:', error);
      toast.error('Failed to add content');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await deleteDoc(doc(db, 'paidContents', id));
      toast.success('Content deleted successfully');
      fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Manage Paid Content</h1>
      
      {/* Add New Content Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Content</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={newContent.title}
                onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={newContent.description}
                onChange={(e) => setNewContent(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Price (₹)</label>
              <Input
                type="number"
                value={newContent.price}
                onChange={(e) => setNewContent(prev => ({ ...prev, price: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">PDF File</label>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, 'pdf')}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Sample PDF File (Optional)</label>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, 'samplePdf')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Thumbnail Image (Optional)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'thumbnail')}
              />
            </div>
            
            <Button type="submit">Add Content</Button>
          </form>
        </CardContent>
      </Card>

      {/* List of Existing Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contents.map((content) => (
          <Card key={content.id}>
            <CardHeader>
              <CardTitle>{content.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {content.thumbnailUrl && (
                <img
                  src={content.thumbnailUrl}
                  alt={content.title}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              )}
              <p className="text-gray-600 mb-2">{content.description}</p>
              <p className="text-xl font-semibold mb-4">₹{content.price}</p>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(content.id)}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(content.pdfUrl, '_blank')}
                >
                  View PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 
import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase/config';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';

interface HeaderAd {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  text?: string;
}

export default function HeaderAdsManager() {
  const [ads, setAds] = useState<HeaderAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAd, setNewAd] = useState({
    linkUrl: '',
    text: '',
    imageFile: null as File | null,
  });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const adsRef = collection(db, 'headerAds');
      const snapshot = await getDocs(adsRef);
      const adsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HeaderAd[];
      setAds(adsList);
    } catch (error) {
      console.error('Error fetching header ads:', error);
      toast.error('Failed to load header ads');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewAd(prev => ({ ...prev, imageFile: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.imageFile) {
      toast.error('Please upload an image');
      return;
    }
    try {
      const imageRef = ref(storage, `header-ads/${Date.now()}_${newAd.imageFile.name}`);
      await uploadBytes(imageRef, newAd.imageFile);
      const imageUrl = await getDownloadURL(imageRef);
      await addDoc(collection(db, 'headerAds'), {
        imageUrl,
        linkUrl: newAd.linkUrl || '',
        text: newAd.text || '',
        createdAt: new Date().toISOString(),
      });
      toast.success('Header ad added');
      setNewAd({ linkUrl: '', text: '', imageFile: null });
      fetchAds();
    } catch (error) {
      console.error('Error adding header ad:', error);
      toast.error('Failed to add header ad');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    try {
      await deleteDoc(doc(db, 'headerAds', id));
      toast.success('Header ad deleted');
      fetchAds();
    } catch (error) {
      console.error('Error deleting header ad:', error);
      toast.error('Failed to delete header ad');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Manage Header Ads</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Ad</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Image</label>
              <Input type="file" accept="image/*" onChange={handleFileChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Link URL</label>
              <Input value={newAd.linkUrl} onChange={e => setNewAd(prev => ({ ...prev, linkUrl: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Text</label>
              <Input value={newAd.text} onChange={e => setNewAd(prev => ({ ...prev, text: e.target.value }))} />
            </div>
            <Button type="submit">Add Ad</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.map(ad => (
          <Card key={ad.id}>
            <CardHeader>
              <CardTitle>Ad</CardTitle>
            </CardHeader>
            <CardContent>
              <img src={ad.imageUrl} alt="ad" className="w-full h-32 object-cover mb-4 rounded" />
              {ad.text && <p className="mb-2">{ad.text}</p>}
              {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="text-blue-500">
                  {ad.linkUrl}
                </a>
              )}
              <Button variant="destructive" className="mt-4" onClick={() => handleDelete(ad.id)}>
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AdsenseManager = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-adsense'],
    queryFn: async () => {
      const docRef = doc(db, 'config', 'adsense');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as { adClient?: string; adSlot?: string; enabled?: boolean };
      }
      return { adClient: '', adSlot: '', enabled: false };
    }
  });

  const [adClient, setAdClient] = useState('');
  const [adSlot, setAdSlot] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (data) {
      setAdClient(data.adClient || '');
      setAdSlot(data.adSlot || '');
      setEnabled(!!data.enabled);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (payload: { adClient: string; adSlot: string; enabled: boolean }) => {
      const docRef = doc(db, 'config', 'adsense');
      await setDoc(docRef, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-adsense'] });
      queryClient.invalidateQueries({ queryKey: ['adsense'] });
      toast.success('AdSense settings updated');
    },
    onError: error => {
      console.error('Error updating adsense settings:', error);
      toast.error('Failed to update AdSense settings');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ adClient, adSlot, enabled });
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
        <CardTitle>Google AdSense Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ad-client">Ad Client ID</Label>
            <Input id="ad-client" value={adClient} onChange={e => setAdClient(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ad-slot">Default Ad Slot</Label>
            <Input id="ad-slot" value={adSlot} onChange={e => setAdSlot(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="ad-enabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="ad-enabled">Enabled</Label>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdsenseManager;

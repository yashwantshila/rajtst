import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const MaintenanceModeManager = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const docRef = doc(db, 'config', 'settings');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as { maintenanceMode?: boolean };
      }
      return { maintenanceMode: false };
    }
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const docRef = doc(db, 'config', 'settings');
      await setDoc(docRef, { maintenanceMode: enabled }, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Maintenance mode updated');
    },
    onError: error => {
      console.error('Error updating maintenance mode:', error);
      toast.error('Failed to update maintenance mode');
    }
  });

  const handleChange = (checked: boolean) => {
    mutation.mutate(checked);
  };

  const enabled = settings?.maintenanceMode ?? false;

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
        <CardTitle>Maintenance Mode</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Switch
          id="maintenance-mode"
          checked={enabled}
          onCheckedChange={handleChange}
          disabled={mutation.isPending}
        />
        <Label htmlFor="maintenance-mode">
          {enabled ? 'Enabled' : 'Disabled'}
        </Label>
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      </CardContent>
    </Card>
  );
};

export default MaintenanceModeManager;

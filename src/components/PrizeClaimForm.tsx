import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SanitizedInput } from "@/components/ui/sanitized-input";
import { SanitizedTextarea } from "@/components/ui/sanitized-textarea";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { auth } from '../services/firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { submitPrizeClaim } from '../services/api/megaTest';
import { getClientIP } from '@/utils/ipDetection';
import { getDeviceId } from '@/utils/deviceId';

interface PrizeClaimFormProps {
  megaTestId: string;
  prize: string;
  rank: number;
  onSuccess?: () => void;
}

const PrizeClaimForm = ({ megaTestId, prize, rank, onSuccess }: PrizeClaimFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user] = useAuthState(auth);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!user) {
      toast.error('You must be logged in to claim a prize.');
      setIsSubmitting(false);
      return;
    }

    try {
      const ipAddress = await getClientIP();
      const deviceId = getDeviceId();

      await submitPrizeClaim(megaTestId, {
        ...formData,
        prize,
        rank,
        ipAddress: ipAddress || undefined,
        deviceId,
      });

      toast.success('Prize claim submitted successfully!');
      setFormData({ name: '', mobile: '', address: '' });
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting prize claim:', error);
      toast.error('Failed to submit prize claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">UPI ID</Label>
        <SanitizedInput
          id="name"
          value={formData.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
          placeholder="Enter your UPI Details"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">Mobile Number</Label>
        <SanitizedInput
          id="mobile"
          type="tel"
          value={formData.mobile}
          onChange={(value) => setFormData({ ...formData, mobile: value })}
          placeholder="Enter your mobile number"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Email Address and Payment Information</Label>
        <SanitizedTextarea
          id="address"
          value={formData.address}
          onChange={(value) => setFormData({ ...formData, address: value })}
          placeholder="Enter your complete email and payment details, we only support phonepe and google pay!"
          required
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Claim'}
      </Button>
    </form>
  );
};

export default PrizeClaimForm; 
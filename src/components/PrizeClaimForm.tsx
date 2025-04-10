import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';

interface PrizeClaimFormProps {
  megaTestId: string;
  prize: string;
  rank: number;
  onSuccess?: () => void;
}

const PrizeClaimForm = ({ megaTestId, prize, rank, onSuccess }: PrizeClaimFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create a new document in the prize-claims collection
      const claimRef = doc(db, 'mega-tests', megaTestId, 'prize-claims', Date.now().toString());
      await setDoc(claimRef, {
        ...formData,
        prize,
        rank,
        status: 'pending',
        createdAt: new Date(),
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
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter your full name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">Mobile Number</Label>
        <Input
          id="mobile"
          type="tel"
          value={formData.mobile}
          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
          placeholder="Enter your mobile number"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Delivery Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter your complete delivery address"
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
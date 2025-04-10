import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Gift, Search, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PrizeClaimsManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: megaTests, isLoading: isLoadingMegaTests } = useQuery({
    queryKey: ['mega-tests'],
    queryFn: async () => {
      const megaTestsRef = collection(db, 'mega-tests');
      const snapshot = await getDocs(megaTestsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  const { data: claims, isLoading: isLoadingClaims, refetch: refetchClaims } = useQuery({
    queryKey: ['prize-claims', statusFilter],
    queryFn: async () => {
      const allClaims = [];
      
      for (const megaTest of megaTests || []) {
        const claimsRef = collection(db, 'mega-tests', megaTest.id, 'prize-claims');
        const claimsQuery = statusFilter === 'all' 
          ? claimsRef 
          : query(claimsRef, where('status', '==', statusFilter));
        
        const snapshot = await getDocs(claimsQuery);
        const megaTestClaims = snapshot.docs.map(doc => ({
          id: doc.id,
          megaTestId: megaTest.id,
          megaTestTitle: megaTest.title,
          ...doc.data()
        }));
        
        allClaims.push(...megaTestClaims);
      }
      
      return allClaims.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    },
    enabled: !!megaTests
  });

  const handleStatusChange = async (claimId: string, megaTestId: string, newStatus: string) => {
    try {
      const claimRef = doc(db, 'mega-tests', megaTestId, 'prize-claims', claimId);
      await updateDoc(claimRef, { status: newStatus });
      toast.success('Claim status updated successfully');
      refetchClaims();
    } catch (error) {
      console.error('Error updating claim status:', error);
      toast.error('Failed to update claim status');
    }
  };

  const handleDeleteClaim = async (claimId: string, megaTestId: string) => {
    if (!window.confirm('Are you sure you want to delete this claim?')) {
      return;
    }

    try {
      const claimRef = doc(db, 'mega-tests', megaTestId, 'prize-claims', claimId);
      await deleteDoc(claimRef);
      toast.success('Claim deleted successfully');
      refetchClaims();
    } catch (error) {
      console.error('Error deleting claim:', error);
      toast.error('Failed to delete claim');
    }
  };

  const filteredClaims = claims?.filter(claim => {
    const searchLower = searchTerm.toLowerCase();
    return (
      claim.name.toLowerCase().includes(searchLower) ||
      claim.mobile.includes(searchTerm) ||
      claim.megaTestTitle.toLowerCase().includes(searchLower) ||
      claim.prize.toLowerCase().includes(searchLower)
    );
  });

  if (isLoadingMegaTests || isLoadingClaims) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Prize Claims Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Claims</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, mobile, mega test, or prize"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Claims</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredClaims?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No prize claims found
              </p>
            ) : (
              filteredClaims?.map((claim) => (
                <Card key={`${claim.megaTestId}-${claim.id}`}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Mega Test</Label>
                        <p className="font-medium">{claim.megaTestTitle}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Prize</Label>
                        <p className="font-medium">{claim.prize}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Claimant</Label>
                        <p className="font-medium">{claim.name}</p>
                        <p className="text-sm text-muted-foreground">{claim.mobile}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <p className="text-sm">{claim.address}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Claimed on {format(claim.createdAt.toDate(), 'PPP p')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={claim.status}
                          onValueChange={(value) => handleStatusChange(claim.id, claim.megaTestId, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClaim(claim.id, claim.megaTestId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizeClaimsManager; 
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Gift, Search, Trash2, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { unparse } from 'papaparse';

const PrizeClaimsManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [megaTestFilter, setMegaTestFilter] = useState('all');
  const [showDuplicateIPs, setShowDuplicateIPs] = useState(false);
  const [showDuplicateDeviceIds, setShowDuplicateDeviceIds] = useState(false);

  const { data: megaTests, isLoading: isLoadingMegaTests } = useQuery({
    queryKey: ['mega-tests'],
    queryFn: async () => {
      const megaTestsRef = collection(db, 'mega-tests');
      const snapshot = await getDocs(megaTestsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        ...doc.data()
      }));
    }
  });

  const { data: claims, isLoading: isLoadingClaims, refetch: refetchClaims } = useQuery({
    queryKey: ['prize-claims', statusFilter, megaTestFilter],
    queryFn: async () => {
      const allClaims = [];
      
      const testsToFetch = megaTestFilter === 'all' 
        ? megaTests 
        : megaTests?.filter(mt => mt.id === megaTestFilter);

      for (const megaTest of testsToFetch || []) {
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
    if (!window.confirm('Are you sure you want to reject this claim? This action cannot be undone.')) {
      return;
    }

    try {
      const claimRef = doc(db, 'mega-tests', megaTestId, 'prize-claims', claimId);
      await updateDoc(claimRef, { status: 'rejected' });
      toast.success('Claim rejected successfully');
      refetchClaims();
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast.error('Failed to reject claim');
    }
  };

  const handleExport = () => {
    if (!finalClaims || finalClaims.length === 0) {
      toast.info('No data to export');
      return;
    }

    const csvData = finalClaims.map(claim => ({
      'Mega Test': claim.megaTestTitle,
      'Name': claim.name,
      'Mobile': claim.mobile,
      'Address': claim.address,
      'Prize': claim.prize,
      'IP Address': claim.ipAddress || 'N/A',
      'Device ID': claim.deviceId || 'N/A',
      'Claimed On': format(claim.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss'),
      'Status': claim.status,
    }));

    const csv = unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `prize-claims-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Prize claims exported successfully');
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

  const duplicateIPs = useMemo(() => {
    if (!filteredClaims) return new Set();

    const ipMap: { [key: string]: string[] } = {};
    filteredClaims.forEach(claim => {
      if (!claim.ipAddress) return;
      const key = `${claim.megaTestId}-${claim.ipAddress}`;
      if (!ipMap[key]) {
        ipMap[key] = [];
      }
      ipMap[key].push(claim.id);
    });

    const duplicates = new Set<string>();
    for (const key in ipMap) {
      if (ipMap[key].length > 1) {
        ipMap[key].forEach(claimId => duplicates.add(claimId));
      }
    }
    return duplicates;
  }, [filteredClaims]);

  const duplicateDeviceIds = useMemo(() => {
    if (!filteredClaims) return new Set();

    const deviceIdMap: { [key: string]: string[] } = {};
    filteredClaims.forEach(claim => {
      if (!claim.deviceId) return;
      const key = `${claim.megaTestId}-${claim.deviceId}`;
      if (!deviceIdMap[key]) {
        deviceIdMap[key] = [];
      }
      deviceIdMap[key].push(claim.id);
    });

    const duplicates = new Set<string>();
    for (const key in deviceIdMap) {
      if (deviceIdMap[key].length > 1) {
        deviceIdMap[key].forEach(claimId => duplicates.add(claimId));
      }
    }
    return duplicates;
  }, [filteredClaims]);

  const finalClaims = useMemo(() => {
    if (!filteredClaims) return [];
    if (!showDuplicateIPs && !showDuplicateDeviceIds) {
        return filteredClaims;
    }

    const duplicateClaimIds = new Set<string>();

    if (showDuplicateIPs) {
        duplicateIPs.forEach(id => duplicateClaimIds.add(id));
    }
    if (showDuplicateDeviceIds) {
        duplicateDeviceIds.forEach(id => duplicateClaimIds.add(id));
    }

    return filteredClaims.filter(claim => duplicateClaimIds.has(claim.id));
  }, [filteredClaims, showDuplicateIPs, showDuplicateDeviceIds, duplicateIPs, duplicateDeviceIds]);

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
              <Label htmlFor="mega-test">Filter by Mega Test</Label>
              <Select value={megaTestFilter} onValueChange={setMegaTestFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mega test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Mega Tests</SelectItem>
                  {megaTests?.map(mt => (
                    <SelectItem key={mt.id} value={mt.id}>{mt.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="duplicate-ips"
                checked={showDuplicateIPs}
                onCheckedChange={setShowDuplicateIPs}
              />
              <Label htmlFor="duplicate-ips">Show Duplicate IPs</Label>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="duplicate-devices"
                checked={showDuplicateDeviceIds}
                onCheckedChange={setShowDuplicateDeviceIds}
              />
              <Label htmlFor="duplicate-devices">Show Duplicate Device IDs</Label>
            </div>
            <div className="flex items-center pt-6">
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mega Test</TableHead>
                  <TableHead>User Details</TableHead>
                  <TableHead>Prize</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Claimed On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finalClaims?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No prize claims found
                    </TableCell>
                  </TableRow>
                ) : (
                  finalClaims?.map((claim) => (
                    <TableRow
                      key={`${claim.megaTestId}-${claim.id}`}
                      className={showDuplicateIPs && duplicateIPs.has(claim.id) ? 'bg-red-100' : ''}
                    >
                      <TableCell>
                        <div className="font-medium">{claim.megaTestTitle}</div>
                      </TableCell>
                      <TableCell>
                        <div>{claim.name}</div>
                        <div className="text-sm text-muted-foreground">{claim.mobile}</div>
                        <div className="text-xs text-muted-foreground">{claim.address}</div>
                      </TableCell>
                      <TableCell>{claim.prize}</TableCell>
                      <TableCell>{claim.ipAddress || 'N/A'}</TableCell>
                      <TableCell>{claim.deviceId || 'N/A'}</TableCell>
                      <TableCell>{format(claim.createdAt.toDate(), 'Pp')}</TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClaim(claim.id, claim.megaTestId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizeClaimsManager; 
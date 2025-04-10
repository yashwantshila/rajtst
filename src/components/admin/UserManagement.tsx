
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateUserRole } from '@/services/firebase/admin';

interface UserManagementProps {
  users?: any[];
  balances?: any[];
  isLoading: boolean;
  usersError?: Error;
  balancesError?: Error;
  refetchUsers: () => void;
}

export const UserManagement = ({ 
  users, 
  balances,
  isLoading, 
  usersError,
  balancesError,
  refetchUsers 
}: UserManagementProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const balanceMap = balances?.reduce((acc, balance) => {
    acc[balance.userId] = balance.amount || 0;
    return acc;
  }, {}) || {};
  
  const filteredUsers = users?.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const makeAdmin = async (userId: string) => {
    try {
      setIsUpdating(true);
      await updateUserRole(userId, 'admin');
      toast.success('User role updated to admin');
      refetchUsers();
    } catch (error: any) {
      toast.error('Failed to update user role: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderErrorMessage = (error: any) => {
    if (!error) return null;
    
    let message = 'Failed to load data';
    let solution = '';
    
    if (error.code === 'permission-denied') {
      message = 'Permission denied when accessing Firestore';
      solution = 'You need to update your Firestore security rules to allow reading users collection.';
    } else if (error.code === 'not-found') {
      message = 'Database collection not found';
      solution = 'Make sure your Firestore database has the required collections.';
    }
    
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-amber-800">{message}</h3>
            <p className="text-amber-700 mt-1">{error.message}</p>
            {solution && <p className="text-amber-700 mt-2 font-medium">{solution}</p>}
            <div className="mt-3 bg-amber-100 p-2 rounded text-xs font-mono overflow-auto">
              <p>Error code: {error.code || 'unknown'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts, permissions and balances</CardDescription>
        <div className="mt-4">
          <Input
            placeholder="Search users by email or username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
      </CardHeader>
      <CardContent>
        {usersError && renderErrorMessage(usersError)}
        {!usersError && balancesError && renderErrorMessage(balancesError)}
        
        {isLoading ? (
          <div className="animate-pulse py-4">Loading users...</div>
        ) : usersError ? (
          <div className="text-center py-4">
            <Button 
              variant="outline" 
              onClick={() => refetchUsers()}
              className="mx-auto"
            >
              Retry Loading Users
            </Button>
          </div>
        ) : !users?.length ? (
          <div className="text-center text-muted-foreground py-8">No users found</div>
        ) : (
          <div className="rounded-md border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredUsers?.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{user.username || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-emerald-700">₹{balanceMap[user.uid] || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={user.role === 'admin' || isUpdating}
                          onClick={() => makeAdmin(user.uid)}
                        >
                          Make Admin
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

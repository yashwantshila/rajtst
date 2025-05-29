import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllUsers, getAllBalances, updateUserRole, User, UserBalance } from '@/services/api/admin';

interface UserManagementProps {
  users?: User[];
  balances?: UserBalance[];
  isLoading: boolean;
  usersError?: Error;
  balancesError?: Error;
  refetchUsers: () => void;
}

const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);
  
  const balanceMap = balances?.reduce((acc, balance) => {
    acc[balance.userId] = balance.amount || 0;
    return acc;
  }, {} as Record<string, number>) || {};
  
  // Sort users by creation date (newest first) and filter by search term
  const filteredUsers = users?.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Calculate pagination
  const totalPages = filteredUsers ? Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers?.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
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
    
    if (error.response?.status === 401) {
      message = 'Unauthorized access';
      solution = 'Please make sure you are logged in as an admin.';
    } else if (error.response?.status === 403) {
      message = 'Access forbidden';
      solution = 'You do not have permission to access this resource.';
    } else if (error.response?.status === 404) {
      message = 'Resource not found';
      solution = 'The requested resource could not be found.';
    }
    
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-amber-800">{message}</h3>
            <p className="text-amber-700 mt-1">{error.message}</p>
            {solution && <p key="solution" className="text-amber-700 mt-2 font-medium">{solution}</p>}
            <div className="mt-3 bg-amber-100 p-2 rounded text-xs font-mono overflow-auto">
              <p>Error code: {error.response?.status || 'unknown'}</p>
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
        <div className="mt-4 flex items-center justify-between">
          <Input
            placeholder="Search users by email or username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <div className="text-sm text-muted-foreground">
            Total Users: {users?.length || 0}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {usersError && <div key="users-error">{renderErrorMessage(usersError)}</div>}
        {!usersError && balancesError && <div key="balances-error">{renderErrorMessage(balancesError)}</div>}
        
        {isLoading ? (
          <div key="loading" className="animate-pulse py-4">Loading users...</div>
        ) : !users || users.length === 0 ? (
          <div key="no-users" className="text-center text-muted-foreground py-8">No users found</div>
        ) : (
          <>
            <div key="users-table" className="rounded-md border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr key="header-row">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {paginatedUsers?.map((user, index) => (
                    <tr key={user.uid || `user-row-${index}`}>
                      <td key={`username-${user.uid}`} className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{user.username || 'N/A'}</div>
                      </td>
                      <td key={`email-${user.uid}`} className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                      <td key={`date-${user.uid}`} className="px-6 py-4 whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td key={`balance-${user.uid}`} className="px-6 py-4 whitespace-nowrap">
                        <span className="text-emerald-700">₹{balanceMap[user.uid] || 0}</span>
                      </td>
                      <td key={`role-${user.uid}`} className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td key={`actions-${user.uid}`} className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <Button 
                            key={`admin-button-${user.uid}`}
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
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers?.length || 0)} of {filteredUsers?.length || 0} users
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

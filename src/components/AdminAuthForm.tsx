
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

// Hardcoded admin credentials
const ADMIN_EMAIL = 'ww@gmail.com';
const ADMIN_PASSWORD = '123';

const AdminAuthForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Check against hardcoded admin credentials
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Set admin session in localStorage
        localStorage.setItem('adminAuth', JSON.stringify({
          email: ADMIN_EMAIL,
          isAdmin: true,
          loginTime: new Date().toISOString()
        }));
        
        toast.success('Admin login successful');
        navigate('/admin');
      } else {
        toast.error('Invalid admin credentials');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to login as admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      <Card className="glass-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Admin Login</CardTitle>
          <CardDescription>Access the administration panel</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleAdminLogin}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login as Admin'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AdminAuthForm;

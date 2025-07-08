import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { getCurrentAdmin } from '@/services/api/adminAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const admin = await getCurrentAdmin();
        setIsAdmin(!!admin?.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    };
    if (!loading) {
      check();
    }
  }, [user, loading]);

  if (loading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-subtle">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin-auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAuthForm from '../components/AdminAuthForm';
import { getCurrentAdmin } from '@/services/api/adminAuth';

const AdminAuth = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const admin = getCurrentAdmin();
    if (admin?.isAdmin) {
      navigate('/admin');
    }
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <AdminAuthForm />
      </div>
    </div>
  );
};

export default AdminAuth;

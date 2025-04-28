import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAuthForm from '../components/AdminAuthForm';
import { useSessionTimeout } from '../hooks/useSessionTimeout';

const AdminAuth = () => {
  const navigate = useNavigate();
  
  // Check if admin is already logged in
  const isAdminAuthenticated = () => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      try {
        const parsedAuth = JSON.parse(adminAuth);
        return parsedAuth && parsedAuth.isAdmin;
      } catch (error) {
        localStorage.removeItem('adminAuth');
        return false;
      }
    }
    return false;
  };

  // Use the session timeout hook
  useSessionTimeout(isAdminAuthenticated());
  
  useEffect(() => {
    if (isAdminAuthenticated()) {
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

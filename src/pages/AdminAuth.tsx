
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAuthForm from '../components/AdminAuthForm';

const AdminAuth = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if admin is already logged in
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      try {
        const parsedAuth = JSON.parse(adminAuth);
        // Check if the admin session exists and is valid
        if (parsedAuth && parsedAuth.isAdmin) {
          navigate('/admin');
        }
      } catch (error) {
        // Invalid session data, remove it
        localStorage.removeItem('adminAuth');
      }
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

import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSocket } from '../hooks/useSocket';

export const ProtectedRoute = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  
  // Initialize socket connection for authenticated routes
  useSocket();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

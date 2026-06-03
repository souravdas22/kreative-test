import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import ChatDashboard from './pages/ChatDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/chat" replace /> : <Login />} 
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/chat" element={<ChatDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />} />
    </Routes>
  );
}

export default App;

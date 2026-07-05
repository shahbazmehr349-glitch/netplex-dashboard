import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PortalPage from './pages/PortalPage';
import DashboardPage from './pages/DashboardPage';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protected><PortalPage /></Protected>} />
          <Route path="/dashboard/:id" element={<Protected><DashboardPage /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

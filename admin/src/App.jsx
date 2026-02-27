import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/UsersPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { BlogPage } from './pages/BlogPage';
import { MessagesPage } from './pages/MessagesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { loggedIn, checking } = useAuth();
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4500);
  };

  if (checking) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginScreen />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout showToast={showToast} toast={toast} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<UsersPage showToast={showToast} />} />
          <Route path="promotions" element={<PromotionsPage showToast={showToast} />} />
          <Route path="notifications" element={<NotificationsPage showToast={showToast} />} />
          <Route path="blog" element={<BlogPage showToast={showToast} />} />
          <Route path="messages" element={<MessagesPage showToast={showToast} />} />
          <Route path="settings" element={<SettingsPage showToast={showToast} />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

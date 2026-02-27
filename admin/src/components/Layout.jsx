import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/users', label: 'Utilizatori', icon: '👥' },
  { to: '/promotions', label: 'Promoții', icon: '🎯' },
  { to: '/notifications', label: 'Notificări', icon: '🔔' },
  { to: '/blog', label: 'Blog', icon: '📝' },
  { to: '/messages', label: 'Mesaje', icon: '💬' },
  { to: '/settings', label: 'Setări', icon: '⚙️' },
];

export function Layout({ showToast, toast }) {
  const { logout } = useAuth();
  const location = useLocation();
  const title = NAV.find((n) => n.to === location.pathname)?.label || 'Admin';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">V</div>
          <span>Volta Admin</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="btn btn-danger" style={{ width: '100%' }} onClick={logout}>
            Deconectare
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <h1 className="main-title">{title}</h1>
        </header>
        <div className="main-body">
          {toast.message && (
            <div className={`alert-toast ${toast.type}`}>{toast.message}</div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

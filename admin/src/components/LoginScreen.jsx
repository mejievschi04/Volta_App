import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Introdu utilizatorul și parola.');
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (result.ok) {
      setPassword('');
    } else {
      setError(result.error || 'Autentificare eșuată');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <h1 style={{ marginBottom: 8, fontSize: '1.5rem' }}>Volta Admin</h1>
        <p style={{ color: '#64748b', marginBottom: 24, fontSize: '0.9375rem' }}>
          Conectează-te cu utilizatorul și parola de administrare.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user">Utilizator</label>
            <input
              id="user"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="pass">Parolă</label>
            <input
              id="pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parola"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', marginBottom: 16, fontSize: '0.9rem' }}>{error}</p>
          )}
          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Se încarcă...' : 'Conectare'}
          </button>
        </form>
      </div>
    </div>
  );
}

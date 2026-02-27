import { useState } from 'react';
import { api, apiJson } from '../api';

export function SettingsPage({ showToast }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      showToast('Parola curentă și cea nouă sunt obligatorii.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Parola nouă trebuie să aibă minim 6 caractere.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Parola nouă și confirmarea nu coincid.', 'error');
      return;
    }
    setLoading(true);
    const { ok, data } = await apiJson('/admin/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      }),
    });
    setLoading(false);
    if (ok) {
      showToast('Parola a fost schimbată cu succes.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast(data?.error || 'Eroare la schimbarea parolei.', 'error');
    }
  };

  return (
    <div className="card-panel" style={{ maxWidth: 480 }}>
      <h2 className="page-title">Schimbare parolă admin</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Parola curentă *</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Parola actuală"
            required
            autoComplete="current-password"
          />
        </div>
        <div className="form-group">
          <label>Parolă nouă *</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minim 6 caractere"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label>Confirmă parola nouă *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Rescrie parola nouă"
            required
            autoComplete="new-password"
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Se salvează...' : 'Schimbă parola'}
          </button>
        </div>
      </form>
    </div>
  );
}

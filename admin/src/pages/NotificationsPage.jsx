import { useState, useEffect } from 'react';
import { api, apiJson } from '../api';

export function NotificationsPage({ showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', message: '', type: 'promovare' });

  const load = () => {
    setLoading(true);
    apiJson('/notifications')
      .then(({ ok, data }) => {
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setList(Array.isArray(arr) ? arr : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', message: '', type: 'promovare' });
    setModalOpen(true);
  };

  const openEdit = (n) => {
    setEditing(n);
    setForm({ title: n.title || '', message: n.message || '', type: n.type || 'promovare' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim() || !form.message?.trim()) {
      showToast('Titlul și mesajul sunt obligatorii.', 'error');
      return;
    }
    if (editing) {
      const { ok, data } = await apiJson(`/notifications/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      if (ok) {
        showToast('Notificare actualizată.');
        setModalOpen(false);
        load();
      } else showToast(data?.error || 'Eroare', 'error');
    } else {
      const { ok, data } = await apiJson('/notifications', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (ok) {
        showToast('Notificare creată și trimisă utilizatorilor cu push.');
        setModalOpen(false);
        load();
      } else showToast(data?.error || 'Eroare', 'error');
    }
  };

  const deleteNotif = async (id) => {
    if (!window.confirm('Ștergi această notificare?')) return;
    setLoading(true);
    try {
      const res = await api(`/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Notificare ștearsă.');
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data?.error || 'Eroare', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn" onClick={openCreate}>
          Adaugă notificare
        </button>
      </div>

      <div className="card-panel">
        <h2 className="page-title">Notificări</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <p>Nu există notificări</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {list.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 20,
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: '1rem' }}>{n.title}</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>{n.message}</p>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    {n.type && <span className="badge badge-muted" style={{ marginRight: 8 }}>{n.type}</span>}
                    {n.created_at ? new Date(n.created_at).toLocaleString('ro-RO') : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(n)}>
                    Editează
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteNotif(n.id)}>
                    Șterge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Editează notificare' : 'Notificare nouă'}</h2>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Titlu *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Mesaj *</label>
                <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Tip</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="promovare">Promovare</option>
                  <option value="info">Info</option>
                  <option value="alerta">Alertă</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ marginBottom: 8 }}>Cum va arăta în aplicație</label>
                <div className="notification-preview">
                  <div className="notification-preview-card">
                    <div className="notification-preview-icon">🔔</div>
                    <div className="notification-preview-content">
                      <div className="notification-preview-title">{form.title || 'Titlul notificării'}</div>
                      <div className="notification-preview-message">
                        {form.message ? (form.message.length > 80 ? form.message.slice(0, 80) + '…' : form.message) : 'Mesajul notificării'}
                      </div>
                    </div>
                  </div>
                  <p className="form-hint">Previzualizare: cum apare în lista de notificări din app</p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn">{editing ? 'Salvează' : 'Trimite'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Anulează</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

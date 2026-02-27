import { useState, useEffect } from 'react';
import { apiJson, apiJsonFormData, api } from '../api';

export function PromotionsPage({ showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', deadline: '', link: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imageHomeFile, setImageHomeFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const load = () => {
    setLoading(true);
    apiJson('/promotions')
      .then(({ ok, data }) => {
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setList(Array.isArray(arr) ? arr : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered =
    filter === 'all'
      ? list
      : list.filter((p) => {
          const d = new Date(p.deadline);
          if (filter === 'active') return d > new Date();
          if (filter === 'expired') return d <= new Date();
          return true;
        });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', deadline: '', link: '' });
    setImageFile(null);
    setImageHomeFile(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      title: p.title || '',
      deadline: p.deadline ? String(p.deadline).slice(0, 16) : '',
      link: p.link || '',
    });
    setImageFile(null);
    setImageHomeFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim() || !form.deadline) {
      showToast('Titlul și data limită sunt obligatorii.', 'error');
      return;
    }
    setSubmitLoading(true);
    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('deadline', form.deadline);
    fd.append('link', form.link?.trim() || '');
    if (editing) {
      if (imageFile) fd.append('image', imageFile);
      else if (editing.image) fd.append('image', editing.image);
      if (imageHomeFile) fd.append('image_home', imageHomeFile);
      else if (editing.image_home !== undefined) fd.append('image_home', editing.image_home || '');
    } else {
      if (imageFile) fd.append('image', imageFile);
      if (imageHomeFile) fd.append('image_home', imageHomeFile);
    }
    try {
      if (editing) {
        const { ok, data } = await apiJsonFormData(`/promotions/${editing.id}`, { method: 'PUT', body: fd });
        if (ok) {
          showToast('Promoție actualizată.');
          setModalOpen(false);
          load();
        } else showToast(data?.error || 'Eroare', 'error');
      } else {
        const { ok, data } = await apiJsonFormData('/promotions', { method: 'POST', body: fd });
        if (ok) {
          showToast('Promoție creată.');
          setModalOpen(false);
          load();
        } else showToast(data?.error || 'Eroare', 'error');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const deletePromo = async (id) => {
    if (!window.confirm('Ștergi această promoție?')) return;
    setLoading(true);
    try {
      const res = await api(`/promotions/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Promoție ștearsă.');
        load();
      } else showToast(data?.error || 'Eroare', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <button type="button" className="btn" onClick={openCreate}>
          Adaugă promoție
        </button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 8, border: '2px solid var(--border)' }}
        >
          <option value="all">Toate</option>
          <option value="active">Active</option>
          <option value="expired">Expirate</option>
        </select>
      </div>

      <div className="card-panel">
        <h2 className="page-title">Promoții</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>Nu există promoții</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 20,
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {p.image_url && (
                    <img src={p.image_url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  )}
                  <div>
                    <strong style={{ fontSize: '1.0625rem' }}>{p.title}</strong>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Deadline: {p.deadline ? new Date(p.deadline).toLocaleString('ro-RO') : '–'}
                    </div>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', marginTop: 4, display: 'block' }}>
                        Link
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => openEdit(p)}>
                    Editează
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => deletePromo(p.id)}>
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
              <h2>{editing ? 'Editează promoție' : 'Adaugă promoție'}</h2>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Titlu *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Data limită *</label>
                <input type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Link (opțional)</label>
                <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Imagine listă promoții</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                {editing?.image_url && !imageFile && <img src={editing.image_url} alt="" className="img-preview" />}
                {imageFile && <p className="form-hint">Fișier selectat: {imageFile.name}</p>}
              </div>
              <div className="form-group">
                <label>Imagine carousel Home</label>
                <input type="file" accept="image/*" onChange={(e) => setImageHomeFile(e.target.files?.[0] || null)} />
                {editing?.image_home_url && !imageHomeFile && <img src={editing.image_home_url} alt="" className="img-preview" />}
                {imageHomeFile && <p className="form-hint">Fișier selectat: {imageHomeFile.name}</p>}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn" disabled={submitLoading}>
                  {submitLoading ? 'Se salvează...' : (editing ? 'Salvează' : 'Creează')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Anulează</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

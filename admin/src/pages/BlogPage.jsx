import { useState, useEffect } from 'react';
import { api, apiJson, apiJsonFormData } from '../api';

export function BlogPage({ showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', author: '', excerpt: '' });
  const [imageFile, setImageFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const load = () => {
    setLoading(true);
    apiJson('/blog')
      .then(({ ok, data }) => {
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setList(Array.isArray(arr) ? arr : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', author: '', excerpt: '' });
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || '',
      content: b.content || '',
      author: b.author || '',
      excerpt: b.excerpt || '',
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim() || !form.content?.trim()) {
      showToast('Titlul și conținutul sunt obligatorii.', 'error');
      return;
    }
    setSubmitLoading(true);
    if (editing) {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('content', form.content.trim());
      fd.append('author', form.author.trim());
      fd.append('excerpt', form.excerpt.trim());
      if (imageFile) fd.append('image', imageFile);
      const { ok, data } = await apiJsonFormData(`/blog/${editing.id}`, { method: 'PUT', body: fd });
      setSubmitLoading(false);
      if (ok) {
        showToast('Articol actualizat.');
        setModalOpen(false);
        load();
      } else showToast(data?.error || 'Eroare', 'error');
    } else {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('content', form.content.trim());
      fd.append('author', form.author.trim());
      fd.append('excerpt', form.excerpt.trim());
      if (imageFile) fd.append('image', imageFile);
      const { ok, data } = await apiJsonFormData('/blog', { method: 'POST', body: fd });
      setSubmitLoading(false);
      if (ok) {
        showToast('Articol creat.');
        setModalOpen(false);
        load();
      } else showToast(data?.error || 'Eroare', 'error');
    }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Ștergi acest articol?')) return;
    setLoading(true);
    try {
      const res = await api(`/blog/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Articol șters.');
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
          Adaugă articol
        </button>
      </div>

      <div className="card-panel">
        <h2 className="page-title">Articole blog</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <p>Nu există articole</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {list.map((b) => (
              <div
                key={b.id}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                  {b.image_url && (
                    <img src={b.image_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '1rem' }}>{b.title}</strong>
                    {b.author && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{b.author}</div>}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {b.created_at ? new Date(b.created_at).toLocaleString('ro-RO') : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(b)}>
                    Editează
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => deletePost(b.id)}>
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
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Editează articol' : 'Articol nou'}</h2>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Titlu *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Conținut *</label>
                <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} required style={{ minHeight: 180 }} />
              </div>
              <div className="form-group">
                <label>Autor</label>
                <input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Rezumat (excerpt)</label>
                <textarea value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Imagine</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                {editing?.image_url && !imageFile && <img src={editing.image_url} alt="" className="img-preview" />}
                {imageFile && <p className="form-hint">Fișier: {imageFile.name}</p>}
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

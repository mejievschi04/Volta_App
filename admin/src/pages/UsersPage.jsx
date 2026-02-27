import { useState, useEffect, useMemo } from 'react';
import { api, apiJson } from '../api';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function UsersPage({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editId, setEditId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cardsUserId, setCardsUserId] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [form, setForm] = useState({ nume: '', prenume: '', telefon: '', email: '', parola: '', data_nasterii: '', sex: '' });

  const loadUsers = () => {
    setLoading(true);
    apiJson('/users')
      .then(({ ok, data }) => {
        let list = [];
        if (ok && data !== undefined) {
          if (Array.isArray(data)) list = data;
          else if (data?.data) list = data.data;
          else if (data?.users) list = data.users;
        }
        setUsers(Array.isArray(list) ? list : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    if (!cardsUserId) return;
    setCardsLoading(true);
    apiJson(`/users/${cardsUserId}/cards`)
      .then(({ ok, data }) => {
        setCards(Array.isArray(data) ? data : []);
      })
      .finally(() => setCardsLoading(false));
  }, [cardsUserId]);

  const filtered = useMemo(() => {
    let list = users.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.nume || '').toLowerCase().includes(q) ||
          (u.prenume || '').toLowerCase().includes(q) ||
          (u.telefon || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'created_at') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (va === vb) return 0;
      return sortDir === 'asc' ? (va < vb ? -1 : 1) : va < vb ? 1 : -1;
    });
    return list;
  }, [users, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else setSortKey(key);
    setPage(1);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ nume: '', prenume: '', telefon: '', email: '', parola: '', data_nasterii: '', sex: '' });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setForm({
      nume: u.nume || '',
      prenume: u.prenume || '',
      telefon: u.telefon || '',
      email: u.email || '',
      parola: '',
      data_nasterii: u.data_nasterii ? String(u.data_nasterii).slice(0, 10) : '',
      sex: u.sex || '',
    });
    setModalOpen(true);
  };

  const openCards = (u) => {
    setCardsUserId(u.id);
    setCards([]);
  };

  const submitUser = async (e) => {
    e.preventDefault();
    if (!form.nume?.trim() || !form.prenume?.trim() || !form.telefon?.trim()) {
      showToast('Nume, prenume și telefon sunt obligatorii.', 'error');
      return;
    }
    if (!editId && !form.parola?.trim()) {
      showToast('Parola este obligatorie la creare.', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editId) {
        const body = { ...form };
        if (!body.parola) delete body.parola;
        const res = await api(`/users/${editId}/admin`, { method: 'PATCH', body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast('Utilizator actualizat.');
          setModalOpen(false);
          loadUsers();
        } else showToast(data.error || 'Eroare', 'error');
      } else {
        const res = await api('/users', { method: 'POST', body: JSON.stringify({ ...form, puncte: 0 }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast('Utilizator creat.');
          setModalOpen(false);
          loadUsers();
        } else showToast(data.error || 'Eroare', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Ștergi acest utilizator? Acțiunea este ireversibilă.')) return;
    setLoading(true);
    try {
      const res = await api(`/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Utilizator șters.');
        if (cardsUserId === id) setCardsUserId(null);
        loadUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Eroare', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const addCard = async (e) => {
    e.preventDefault();
    const formEl = e.target;
    const discount_value = parseInt(formEl.discount_value?.value, 10);
    const expires_at = formEl.expires_at?.value || null;
    if (discount_value !== 5 && discount_value !== 10) {
      showToast('Reducerea trebuie să fie 5 sau 10.', 'error');
      return;
    }
    setCardsLoading(true);
    const { ok, data } = await apiJson(`/users/${cardsUserId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ discount_value, expires_at: expires_at || null }),
    });
    setCardsLoading(false);
    if (ok && data?.card) {
      setCards((c) => [data.card, ...c]);
      showToast('Card adăugat.');
      formEl.reset();
    } else showToast(data?.error || 'Eroare', 'error');
  };

  const removeCard = async (cardId) => {
    if (!window.confirm('Anulezi acest card?')) return;
    setCardsLoading(true);
    const res = await api(`/users/${cardsUserId}/cards/${cardId}`, { method: 'DELETE' });
    setCardsLoading(false);
    if (res.ok) {
      setCards((c) => c.filter((x) => x.id !== cardId));
      showToast('Card anulat.');
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data?.error || 'Eroare', 'error');
    }
  };

  const Th = ({ label, keyName }) => (
    <th className="sortable" onClick={() => handleSort(keyName)}>
      {label} {sortKey === keyName ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  );

  const userForCards = users.find((u) => u.id === cardsUserId);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <button type="button" className="btn" onClick={openCreate}>
          Adaugă utilizator
        </button>
        <input
          type="text"
          placeholder="Caută nume, telefon, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280, padding: '10px 14px', borderRadius: 8, border: '2px solid var(--border)' }}
        />
      </div>

      <div className="card-panel">
        <h2 className="page-title">Utilizatori</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : pageData.length === 0 ? (
          <div className="empty-state">
            <p>Nu există utilizatori</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <Th label="ID" keyName="id" />
                    <Th label="Nume" keyName="nume" />
                    <Th label="Prenume" keyName="prenume" />
                    <Th label="Telefon" keyName="telefon" />
                    <th>Email</th>
                    <th>Carduri</th>
                    <Th label="Creat" keyName="created_at" />
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((u) => (
                    <tr key={u.id}>
                      <td><strong>#{u.id}</strong></td>
                      <td>{u.nume}</td>
                      <td>{u.prenume}</td>
                      <td>{u.telefon}</td>
                      <td>{u.email || '–'}</td>
                      <td>
                        <span className={u.card_count > 0 ? 'badge badge-success' : 'badge badge-muted'}>
                          {u.card_count > 0 ? `${u.card_count} carduri` : 'Fără card'}
                        </span>
                      </td>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleString('ro-RO') : '–'}</td>
                      <td>
                        <button type="button" className="btn btn-sm btn-secondary" style={{ marginRight: 8 }} onClick={() => openEdit(u)}>
                          Editează
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary" style={{ marginRight: 8 }} onClick={() => openCards(u)}>
                          Carduri
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>
                          Șterge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > pageSize && (
              <div className="pagination">
                <span>Pagina</span>
                <select value={page} onChange={(e) => setPage(Number(e.target.value))}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <span>din {totalPages}</span>
                <span style={{ color: 'var(--text-muted)' }}>({filtered.length} total)</span>
                <span>Pe pagină:</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Create/Edit User */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Editează utilizator' : 'Adaugă utilizator'}</h2>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={submitUser} className="modal-body">
              <div className="form-group">
                <label>Nume *</label>
                <input value={form.nume} onChange={(e) => setForm((f) => ({ ...f, nume: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Prenume *</label>
                <input value={form.prenume} onChange={(e) => setForm((f) => ({ ...f, prenume: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Telefon *</label>
                <input value={form.telefon} onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Parolă {editId ? '(lăsați gol pentru a nu schimba)' : '*'}</label>
                <input type="password" value={form.parola} onChange={(e) => setForm((f) => ({ ...f, parola: e.target.value }))} placeholder="Minim 6 caractere" />
              </div>
              <div className="form-group">
                <label>Data nașterii</label>
                <input type="date" value={form.data_nasterii} onChange={(e) => setForm((f) => ({ ...f, data_nasterii: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Sex</label>
                <select value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}>
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Feminin</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn">{editId ? 'Salvează' : 'Creează'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Anulează</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Carduri */}
      {cardsUserId != null && (
        <div className="modal-overlay" onClick={() => setCardsUserId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Carduri reducere – {userForCards ? `${userForCards.prenume || ''} ${userForCards.nume || ''}`.trim() || `#${cardsUserId}` : ''}</h2>
              <button type="button" className="modal-close" onClick={() => setCardsUserId(null)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={addCard} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Reducere (%)</label>
                    <select name="discount_value" required>
                      <option value="5">5%</option>
                      <option value="10">10%</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Expiră la</label>
                    <input type="datetime-local" name="expires_at" />
                  </div>
                  <button type="submit" className="btn" disabled={cardsLoading}>
                    {cardsLoading ? '...' : 'Adaugă card'}
                  </button>
                </div>
              </form>
              {cardsLoading && !cards.length ? (
                <div className="spinner" style={{ margin: '0 auto' }} />
              ) : cards.length === 0 ? (
                <p className="empty-state">Nu are carduri.</p>
              ) : (
                <ul style={{ listStyle: 'none' }}>
                  {cards.map((card) => (
                    <li key={card.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><strong>{card.discount_value}%</strong> – expiră: {card.expires_at ? new Date(card.expires_at).toLocaleString('ro-RO') : 'fără expirare'}</span>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => removeCard(card.id)}>Șterge</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

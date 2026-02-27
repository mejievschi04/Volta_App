import { useState, useEffect, useMemo, useRef } from 'react';
import { api, apiJson } from '../api';

export function MessagesPage({ showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const load = () => {
    setLoading(true);
    apiJson('/messages')
      .then(({ ok, data }) => {
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setList(Array.isArray(arr) ? arr : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const threads = useMemo(() => {
    const byUser = new Map();
    list.forEach((m) => {
      const uid = m.user_id ?? 'anon';
      if (!byUser.has(uid)) {
        byUser.set(uid, {
          user_id: m.user_id,
          user_name: m.nume || m.prenume ? `${m.prenume || ''} ${m.nume || ''}`.trim() : null,
          telefon: m.telefon,
          email: m.email,
          messages: [],
          unreadCount: 0,
        });
      }
      const t = byUser.get(uid);
      t.messages.push(m);
      if (!m.read && !m.is_from_admin) t.unreadCount++;
    });
    byUser.forEach((t) => {
      t.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });
    return Array.from(byUser.entries()).map(([uid, t]) => ({ ...t, key: uid }));
  }, [list]);

  const currentThread = useMemo(() => threads.find((t) => String(t.key) === String(selectedUserId)), [threads, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages?.length]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentThread?.user_id) return;
    setReplyLoading(true);
    const { ok, data } = await apiJson('/messages/reply', {
      method: 'POST',
      body: JSON.stringify({ user_id: currentThread.user_id, message: replyText.trim() }),
    });
    setReplyLoading(false);
    if (ok) {
      setReplyText('');
      load();
    } else showToast(data?.error || 'Eroare la trimitere', 'error');
  };

  const deleteThread = async (userId) => {
    if (!window.confirm('Ștergi toată conversația cu acest utilizator?')) return;
    setDeleteLoading(true);
    const res = await api(`/admin/messages/thread/${userId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setDeleteLoading(false);
    if (res.ok) {
      showToast('Conversație ștearsă.');
      setSelectedUserId(null);
      load();
    } else showToast(data?.error || 'Eroare', 'error');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="messages-layout">
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2 className="page-title" style={{ margin: 0 }}>Conversații</h2>
        </div>
        <div className="messages-sidebar-list">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <div className="spinner" />
            </div>
          ) : threads.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>Nu există mesaje</p>
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`messages-conv-item ${selectedUserId === t.key ? 'active' : ''}`}
                onClick={() => setSelectedUserId(t.key)}
              >
                <div className="messages-conv-name">
                  {t.user_name || t.telefon || t.email || (t.user_id != null ? `User #${t.user_id}` : 'Anonim')}
                </div>
                <div className="messages-conv-meta">
                  {t.messages.length} mesaje
                  {t.unreadCount > 0 && <span className="badge badge-warning" style={{ marginLeft: 8 }}>{t.unreadCount}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="messages-chat">
        {!currentThread ? (
          <div className="messages-empty">
            <div className="messages-empty-icon">💬</div>
            <h3>Selectează o conversație</h3>
            <p>Alege o conversație din lista din stânga pentru a răspunde</p>
          </div>
        ) : (
          <>
            <div className="messages-chat-header">
              <div className="messages-chat-header-avatar">👤</div>
              <div className="messages-chat-header-info">
                <strong>{currentThread.user_name || currentThread.telefon || currentThread.email || `User #${currentThread.user_id}` || 'Anonim'}</strong>
                <span>Volta Support</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => deleteThread(currentThread.user_id)}
                disabled={deleteLoading || !currentThread.user_id}
                title="Șterge conversația"
              >
                Șterge conversația
              </button>
            </div>

            <div className="messages-chat-body">
              {currentThread.messages.map((m) => {
                const isAdmin = m.is_from_admin;
                return (
                  <div
                    key={m.id}
                    className={`messages-bubble-wrap ${isAdmin ? 'messages-bubble-admin' : 'messages-bubble-user'}`}
                  >
                    <div className={`messages-bubble ${isAdmin ? 'messages-bubble--admin' : 'messages-bubble--user'}`}>
                      <div className="messages-bubble-text">{m.message}</div>
                      <div className="messages-bubble-time">{formatTime(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="messages-chat-footer">
              <form onSubmit={sendReply} className="messages-chat-form">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={currentThread.user_id ? 'Scrie un mesaj...' : 'Nu poți răspunde la conversații anonime.'}
                  className="messages-chat-input"
                  disabled={!currentThread.user_id}
                />
                <button
                  type="submit"
                  className="messages-chat-send"
                  disabled={replyLoading || !replyText.trim() || !currentThread.user_id}
                  title="Trimite"
                >
                  {replyLoading ? '…' : '→'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

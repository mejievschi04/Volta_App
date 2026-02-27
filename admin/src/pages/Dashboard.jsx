import { useState, useEffect, useMemo } from 'react';
import { apiJson } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = { primary: '#FACC15', blue: '#3b82f6', gray: '#64748b' };
const PERIODS = [
  { value: 7, label: '7 zile' },
  { value: 14, label: '14 zile' },
  { value: 30, label: '30 zile' },
  { value: 90, label: '90 zile' },
];

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
  fontSize: 13,
};

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(7);
  const [stats, setStats] = useState({
    users: 0,
    promotions: 0,
    activePromo: 0,
    expiredPromo: 0,
    messages: 0,
    notifications: 0,
    blog: 0,
  });
  const [usersRaw, setUsersRaw] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiJson('/users'),
      apiJson('/promotions'),
      apiJson('/notifications'),
      apiJson('/blog'),
      apiJson('/messages'),
    ])
      .then(([u, p, n, b, m]) => {
        const users = Array.isArray(u.data) ? u.data : (u.data?.data || u.data?.users || []);
        const promos = Array.isArray(p.data) ? p.data : (p.data?.data || p.data || []);
        const notifs = Array.isArray(n.data) ? n.data : (n.data?.data || []);
        const posts = Array.isArray(b.data) ? b.data : (b.data?.data || []);
        const msgs = Array.isArray(m.data) ? m.data : (m.data?.data || []);

        const now = new Date();
        let active = 0, expired = 0;
        promos.forEach((pr) => {
          if (new Date(pr.deadline) < now) expired++;
          else active++;
        });

        setStats({
          users: users.length,
          promotions: promos.length,
          activePromo: active,
          expiredPromo: expired,
          messages: msgs.length,
          notifications: notifs.length,
          blog: posts.length,
        });
        setUsersRaw(users);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const usersByDay = useMemo(() => {
    const days = [];
    const n = periodDays;
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const count = usersRaw.filter((us) => us.created_at && new Date(us.created_at).toDateString() === dateStr).length;
      days.push({
        label: d.toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        fullDate: d.toLocaleDateString('ro-RO'),
        utilizatori: count,
      });
    }
    return days;
  }, [usersRaw, periodDays]);

  if (loading) {
    return (
      <div className="card-panel">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Utilizatori', value: stats.users, icon: '👥', accent: '#6366f1' },
    { label: 'Promoții active', value: stats.activePromo, icon: '🎯', accent: '#22c55e' },
    { label: 'Promoții expirate', value: stats.expiredPromo, icon: '⏰', accent: '#ef4444' },
    { label: 'Mesaje', value: stats.messages, icon: '💬', accent: '#f59e0b' },
    { label: 'Notificări', value: stats.notifications, icon: '🔔', accent: '#06b6d4' },
    { label: 'Articole blog', value: stats.blog, icon: '📝', accent: '#8b5cf6' },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>Dashboard</h2>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Reîmprospătează
        </button>
      </div>

      <div className="kpi-cards">
        {cards.map((c) => (
          <div key={c.label} className="kpi-card" style={{ '--kpi-accent': c.accent }}>
            <div className="kpi-card__icon">{c.icon}</div>
            <div className="kpi-card__content">
              <span className="kpi-card__value">{c.value.toLocaleString('ro-RO')}</span>
              <span className="kpi-card__label">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-chart-card">
        <div className="dashboard-chart-header">
          <div>
            <h3 className="dashboard-chart-title">Utilizatori noi</h3>
            <p className="dashboard-chart-desc">Câți utilizatori s-au înregistrat în fiecare zi.</p>
          </div>
          <div className="dashboard-chart-period">
            <label htmlFor="chart-period">Perioadă:</label>
            <select
              id="chart-period"
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="dashboard-chart-select"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  Ultimele {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="dashboard-chart-inner">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={usersByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLORS.gray, fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fill: COLORS.gray, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [value, 'Înregistrări']}
                labelFormatter={(_, p) => p?.[0]?.payload?.fullDate}
              />
              <Line
                type="monotone"
                dataKey="utilizatori"
                stroke={COLORS.blue}
                strokeWidth={2}
                dot={{ fill: COLORS.blue, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: COLORS.blue, stroke: '#fff', strokeWidth: 2 }}
                name="Utilizatori"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

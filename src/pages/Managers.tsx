import { useEffect, useState } from 'react';
import { type Client, type Manager, type Shipment } from '../data/mock';
import { getManagers, getApiErrorMessage } from '../api';
import ApiLoadErrorBanner from '../components/ApiLoadErrorBanner';

export default function Managers() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Manager | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newRoute, setNewRoute] = useState({ city: '', country: '', address: '', note: '' });

  useEffect(() => {
    getManagers()
      .then(({ managers: m, shipments: s, clients: c }) => {
        setManagers(m);
        setShipments(s);
        setClients(c);
      })
      .catch((error) => {
        setLoadError(getApiErrorMessage(error, 'Не удалось загрузить менеджеров.'));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 10, color: '#8B95A7', fontSize: 14, fontWeight: 700 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2.5px solid #E2E8F0', borderTopColor: '#3B82F6',
          animation: 'spin 0.7s linear infinite',
        }} />
        Загрузка...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError && managers.length === 0) {
    return <ApiLoadErrorBanner message={loadError} />;
  }

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748B' }}>Всего менеджеров: <strong>{managers.length}</strong></div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '8px 18px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          + Добавить менеджера
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {managers.map(m => {
          const managerShipments = shipments.filter(s => s.managerId === m.id);
          const isSelected = selected?.id === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelected(isSelected ? null : m)}
              style={{
                background: '#fff', borderRadius: 12, padding: '18px 20px',
                border: `1.5px solid ${isSelected ? '#3B82F6' : '#E2E8F0'}`,
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%', background: '#3B82F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
                }}>{m.avatar}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{m.region}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  ['📧', m.email],
                  ['📞', m.phone],
                  ['✈', m.telegramId],
                ].map(([icon, val]) => (
                  <div key={val} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <span style={{ fontSize: 11 }}>{icon}</span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Активных грузов</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{m.activeShipments}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Всего за месяц</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{managerShipments.length}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#F0FDF4', color: '#10B981', fontWeight: 600 }}>Активен</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected manager detail */}
      {selected && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Грузы менеджера: {selected.name}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowForm(true)}
                style={{ padding: '6px 14px', background: '#F0FDF4', color: '#10B981', border: '1px solid #D1FAE5', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Добавить маршрут
              </button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                {['Трекинг', 'Тип', 'Клиент', 'Откуда', 'Куда', 'Статус', 'ETA'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#94A3B8', fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.filter(s => s.managerId === selected.id).map(s => {
                const client = clients.find(c => c.id === s.clientId);
                const statusC: Record<string, string> = { planned: '#F59E0B', in_transit: '#3B82F6', delivered: '#10B981', delayed: '#EF4444', at_checkpoint: '#8B5CF6' };
                const statusL: Record<string, string> = { planned: 'Запланирован', in_transit: 'В пути', delivered: 'Доставлен', delayed: 'Задержка', at_checkpoint: 'На пункте' };
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0F172A' }}>{s.trackingNumber}</td>
                    <td style={{ padding: '9px 10px' }}>{s.type === 'auto' ? '🚛' : s.type === 'air' ? '✈' : s.type === 'sea' ? '🚢' : '🔀'}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{client?.company}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{s.origin}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{s.destination}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: statusC[s.status] + '18', color: statusC[s.status] }}>
                        {statusL[s.status]}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#94A3B8' }}>{s.estimatedDelivery}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Route Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 22, width: 860, maxWidth: '96vw', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '26px 30px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 21, fontWeight: 950, color: '#0F172A', letterSpacing: -0.4 }}>Добавить точку маршрута</div>
                <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 5 }}>Менеджер вручную добавляет город, терминал и комментарий</div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: '#F8FAFC', cursor: 'pointer', fontSize: 20, color: '#94A3B8' }}>×</button>
            </div>
            <div style={{ padding: '22px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#F7F8FA', borderRadius: 18, padding: 18, border: '1px solid #EEF2F7', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Город', key: 'city', placeholder: 'например: Алматы' },
                { label: 'Страна', key: 'country', placeholder: 'например: Казахстан' },
                { label: 'Адрес / Терминал', key: 'address', placeholder: 'Полный адрес или название терминала' },
                { label: 'Примечание', key: 'note', placeholder: 'Доп. информация (необязательно)' },
              ].map(field => (
                <div key={field.key}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#64748B', marginBottom: 7, textTransform: 'uppercase' }}>{field.label}</div>
                  <input
                    value={(newRoute as any)[field.key]}
                    onChange={e => setNewRoute(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', color: '#0F172A', background: '#fff' }}
                  />
                </div>
              ))}
            </div>
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#64748B', marginBottom: 7, textTransform: 'uppercase' }}>Менеджер</div>
                <select style={{ width: '100%', padding: '13px 14px', borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', color: '#0F172A', background: '#fff' }}>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name} — {m.region}</option>)}
                </select>
              </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowForm(false)}
                style={{ minWidth: 138, padding: '13px 22px', background: '#fff', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 14, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                Отмена
              </button>
              <button onClick={() => { setShowForm(false); setNewRoute({ city: '', country: '', address: '', note: '' }); }}
                style={{ minWidth: 190, padding: '13px 22px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 950, fontSize: 14, cursor: 'pointer' }}>
                Добавить точку
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

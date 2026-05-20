import { useEffect, useState } from 'react';
import { clients, managers, type Shipment } from '../data/mock';
import { getShipments } from '../api';

const statusColors: Record<string, string> = {
  planned: '#F59E0B', in_transit: '#3B82F6', at_checkpoint: '#8B5CF6', delivered: '#10B981', delayed: '#EF4444',
};
const statusLabel: Record<string, string> = {
  planned: 'Запланирован', in_transit: 'В пути', at_checkpoint: 'На пункте', delivered: 'Доставлен', delayed: 'Задержка',
};
const statusBg: Record<string, string> = {
  planned: '#FEF3C7', in_transit: '#DBEAFE', at_checkpoint: '#EDE9FE', delivered: '#DCFCE7', delayed: '#FEE2E2',
};

function TruckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#DBEAFE"/>
      <path d="M8 16h22v18H8z" fill="#3B82F6" rx="2"/>
      <path d="M30 20h6l4 6v8h-10V20z" fill="#2563EB"/>
      <circle cx="14" cy="36" r="3" fill="#1E40AF" stroke="#fff" strokeWidth="1.5"/>
      <circle cx="36" cy="36" r="3" fill="#1E40AF" stroke="#fff" strokeWidth="1.5"/>
      <path d="M10 24h14" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M32 26l2.5 3H30V26h2z" fill="#93C5FD"/>
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#EDE9FE"/>
      <path d="M38 14L10 24l9 3 3 7 5-6 8 2 3-16z" fill="#7C3AED"/>
      <path d="M19 27l2 6" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="38" cy="14" r="2" fill="#DDD6FE"/>
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#CFFAFE"/>
      <rect x="12" y="22" width="24" height="12" rx="2" fill="#0891B2"/>
      <path d="M16 22V16h8v6" fill="#06B6D4"/>
      <path d="M8 34c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" stroke="#0E7490" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <rect x="19" y="12" width="2" height="6" fill="#164E63"/>
      <path d="M21 13l7 4" stroke="#164E63" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IntermodalIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#DCFCE7"/>
      <rect x="8" y="18" width="14" height="10" rx="2" fill="#16A34A"/>
      <rect x="26" y="18" width="14" height="10" rx="2" fill="#15803D"/>
      <path d="M22 23h4" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="13" cy="30" r="2.5" fill="#166534" stroke="#fff" strokeWidth="1"/>
      <circle cx="35" cy="30" r="2.5" fill="#166534" stroke="#fff" strokeWidth="1"/>
      <path d="M8 23h4M36 23h4" stroke="#86EFAC" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'auto') return <TruckIcon />;
  if (type === 'air') return <PlaneIcon />;
  if (type === 'sea') return <ShipIcon />;
  return <IntermodalIcon />;
}

const typeLabel: Record<string, string> = {
  auto: 'Автоперевозка', air: 'Авиаперевозка', sea: 'Морская', intermodal: 'Интермодальная',
};

const filterLabels = [
  { v: 'all', l: 'Все' },
  { v: 'in_transit', l: 'В пути' },
  { v: 'planned', l: 'Запланировано' },
  { v: 'delivered', l: 'Доставлено' },
  { v: 'delayed', l: 'Задержка' },
];

const typeFilters = [
  { v: 'all', l: 'Все типы' },
  { v: 'auto', l: 'Авто' },
  { v: 'air', l: 'Авиа' },
  { v: 'sea', l: 'Море' },
  { v: 'intermodal', l: 'Интермодал' },
];

const stepLabels = ['Создан', 'В пути', 'На пункте', 'Доставлен'];
const stepKeys = ['planned', 'in_transit', 'at_checkpoint', 'delivered'];

export default function Shipments() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Shipment | null>(null);

  useEffect(() => {
    getShipments()
      .then(({ shipments: data }) => setShipments(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = shipments.filter(s =>
    (filter === 'all' || s.status === filter) &&
    (typeFilter === 'all' || s.type === typeFilter)
  );

  if (loading) {
    return (
      <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 10, color: '#8B95A7', fontSize: 14, fontWeight: 700 }}>
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

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 2, background: '#fff', borderRadius: 10, padding: '4px', border: '1px solid #E2E8F0' }}>
          {filterLabels.map(({ v, l }) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: filter === v ? 700 : 400,
              background: filter === v ? '#1E293B' : 'transparent',
              color: filter === v ? '#fff' : '#64748B',
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 2, background: '#fff', borderRadius: 10, padding: '4px', border: '1px solid #E2E8F0' }}>
          {typeFilters.map(({ v, l }) => (
            <button key={v} onClick={() => setTypeFilter(v)} style={{
              padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: typeFilter === v ? 700 : 400,
              background: typeFilter === v ? '#3B82F6' : 'transparent',
              color: typeFilter === v ? '#fff' : '#64748B',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}>
              {v !== 'all' && (
                <span style={{ fontSize: 13 }}>
                  {v === 'auto' ? '🚛' : v === 'air' ? '✈' : v === 'sea' ? '🚢' : '🔀'}
                </span>
              )}
              {l}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button style={{
            padding: '9px 20px', background: '#3B82F6', color: '#fff',
            border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Новый груз
          </button>
        </div>
      </div>

      {/* List + Detail */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => {
            const client = clients.find(c => c.id === s.clientId);
            const manager = managers.find(m => m.id === s.managerId);
            const isSelected = selected?.id === s.id;
            const stepIdx = s.status === 'delayed' ? 1 : Math.max(0, stepKeys.indexOf(s.status));

            return (
              <div
                key={s.id}
                onClick={() => setSelected(isSelected ? null : s)}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '18px 22px 16px',
                  border: `1.5px solid ${isSelected ? '#3B82F6' : '#EEF2FF'}`,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Icon */}
                  <div style={{ flexShrink: 0 }}>
                    <TypeIcon type={s.type} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: -0.3 }}>
                        {s.trackingNumber}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: statusBg[s.status], color: statusColors[s.status],
                      }}>{statusLabel[s.status]}</span>
                      {s.telegramNotifications && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                          background: '#E0F2FE', color: '#0369A1',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="#0369A1"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                          TG
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 5, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#64748B" strokeWidth="2"/><circle cx="12" cy="9" r="2.5" stroke="#64748B" strokeWidth="2"/></svg>
                        <span style={{ fontWeight: 600 }}>{s.origin}</span>
                        <svg width="14" height="10" viewBox="0 0 24 10" fill="none"><path d="M1 5h20M16 1l5 4-5 4" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span style={{ fontWeight: 600 }}>{s.destination}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#94A3B8" strokeWidth="2"/><path d="M3 9h18" stroke="#94A3B8" strokeWidth="2"/></svg>
                        {s.cargo}
                      </div>
                    </div>
                  </div>

                  {/* Right meta */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{client?.company}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      <span style={{ fontWeight: 500 }}>Менеджер:</span> {manager?.name.split(' ').slice(0, 2).join(' ')}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      {s.weight} · {s.volume}
                    </div>
                  </div>
                </div>

                {/* Progress stepper */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {stepKeys.map((step, i) => {
                      const done = i < stepIdx;
                      const active = i === stepIdx;
                      const color = s.status === 'delayed' && active ? '#EF4444' : '#3B82F6';
                      return (
                        <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: i === 0 ? 'flex-start' : i === stepKeys.length - 1 ? 'flex-end' : 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            {i > 0 && (
                              <div style={{
                                flex: 1, height: 3, borderRadius: 2,
                                background: i <= stepIdx ? color : '#E2E8F0',
                              }} />
                            )}
                            <div style={{
                              width: active ? 14 : 10,
                              height: active ? 14 : 10,
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: done ? '#3B82F6' : active ? '#fff' : '#E2E8F0',
                              border: active ? `3px solid ${color}` : done ? 'none' : '2px solid #E2E8F0',
                              transition: 'all 0.2s',
                            }} />
                            {i < stepKeys.length - 1 && (
                              <div style={{
                                flex: 1, height: 3, borderRadius: 2,
                                background: i < stepIdx ? color : '#E2E8F0',
                              }} />
                            )}
                          </div>
                          <span style={{
                            fontSize: 10, marginTop: 4, fontWeight: active ? 700 : 400,
                            color: active ? color : done ? '#64748B' : '#CBD5E1',
                          }}>{stepLabels[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{
            width: 340, background: '#fff', borderRadius: 14, padding: '22px',
            border: '1px solid #E2E8F0', alignSelf: 'flex-start',
            position: 'sticky', top: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <TypeIcon type={selected.type} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{selected.trackingNumber}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{typeLabel[selected.type]}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: '#F1F5F9', border: 'none', cursor: 'pointer',
                width: 28, height: 28, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', fontSize: 16, fontWeight: 700,
              }}>×</button>
            </div>

            {/* Details grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {[
                { icon: '🏢', label: 'Клиент', value: clients.find(c => c.id === selected.clientId)?.company },
                { icon: '👤', label: 'Менеджер', value: managers.find(m => m.id === selected.managerId)?.name },
                { icon: '📦', label: 'Груз', value: selected.cargo },
                { icon: '⚖', label: 'Вес / Объём', value: `${selected.weight} · ${selected.volume}` },
                { icon: '📅', label: 'Плановая дата', value: selected.estimatedDelivery },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 10px', borderRadius: 8, background: '#F8FAFC',
                }}>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', maxWidth: 160, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Route timeline */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              Маршрут · {selected.checkpoints.length} точки
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {selected.checkpoints.map((cp, i) => (
                <div key={cp.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                      background: cp.status === 'passed' ? '#10B981' : cp.status === 'current' ? '#fff' : '#E2E8F0',
                      border: cp.status === 'current' ? '3px solid #3B82F6' : cp.status === 'passed' ? '2px solid #10B981' : '2px solid #E2E8F0',
                    }} />
                    {i < selected.checkpoints.length - 1 && (
                      <div style={{
                        width: 2, flex: 1, minHeight: 22,
                        background: cp.status === 'passed' ? '#D1FAE5' : '#F1F5F9',
                        margin: '3px 0',
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: cp.status === 'upcoming' ? '#94A3B8' : '#0F172A' }}>
                          {cp.city}, {cp.country}
                        </div>
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{cp.address}</div>
                        {cp.note && (
                          <div style={{ fontSize: 10, color: '#F59E0B', marginTop: 4, background: '#FFFBEB', padding: '2px 7px', borderRadius: 5, display: 'inline-block' }}>
                            ⚠ {cp.note}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: cp.arrivedAt ? '#10B981' : '#94A3B8', textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        {cp.arrivedAt ? `✓ ${cp.arrivedAt}` : cp.plannedAt}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

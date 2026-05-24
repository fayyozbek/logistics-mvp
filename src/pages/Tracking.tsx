import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CircleDollarSign, Clock3, MapPin, Plus, Search, Send, X } from 'lucide-react';
import { clients, managers, type CheckPoint, type Shipment } from '../data/mock';
import { addShipmentCheckpoint, ApiError, getApiErrorMessage, getTrackingData, updateCheckpoint } from '../api';
import ApiLoadErrorBanner from '../components/ApiLoadErrorBanner';

const checkpointFieldLabels: Record<string, string> = {
  city: 'Город',
  country: 'Страна',
  address: 'Адрес',
  plannedAt: 'Плановое время',
  status: 'Статус',
  note: 'Примечание',
};

function formatFieldErrors(errors: Record<string, string[]>): string[] {
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((message) => {
      const label = checkpointFieldLabels[field] ?? field;
      return `${label}: ${message}`;
    }),
  );
}

function pluralPoints(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} точка`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} точки`;
  return `${n} точек`;
}

function toPlannedAt(value: string): string {
  if (!value) {
    return new Date().toISOString().slice(0, 16).replace('T', ' ');
  }
  return value.includes('T') ? value.replace('T', ' ') : value;
}

const statusColors: Record<string, string> = {
  planned: '#F59E0B',
  in_transit: '#2563EB',
  at_checkpoint: '#7C3AED',
  delivered: '#059669',
  delayed: '#DC2626',
};

const statusBg: Record<string, string> = {
  planned: '#FEF3C7',
  in_transit: '#DBEAFE',
  at_checkpoint: '#EDE9FE',
  delivered: '#D1FAE5',
  delayed: '#FEE2E2',
};

const statusLabel: Record<string, string> = {
  planned: 'Запланирован',
  in_transit: 'В пути',
  at_checkpoint: 'На пункте',
  delivered: 'Доставлен',
  delayed: 'Задержка',
};

const typeLabel: Record<string, string> = {
  auto: 'Авто',
  air: 'Авиа',
  sea: 'Море',
  intermodal: 'Интермодал',
};

const typeColor: Record<string, string> = {
  auto: '#2563EB',
  air: '#7C3AED',
  sea: '#0891B2',
  intermodal: '#059669',
};

function TransportIcon({ type, color = typeColor[type] }: { type: string; color?: string }) {
  if (type === 'air') {
    return (
      <svg width="74" height="42" viewBox="0 0 120 70" fill="none">
        <path d="M104 32c-18 1-35 3-51 5L25 15c-2-2-6-2-8 0l20 27-19 4-10-8c-2-1-5 0-6 2l10 16c1 2 3 3 5 2l88-17c9-2 12-10 9-12-2-1-5 0-10 3Z" fill={color} opacity="0.28"/>
        <path d="M48 47l-7 17c-1 3 2 5 5 3l20-23" fill={color} opacity="0.22"/>
      </svg>
    );
  }
  if (type === 'sea') {
    return (
      <svg width="78" height="44" viewBox="0 0 128 72" fill="none">
        <rect x="32" y="20" width="18" height="12" rx="2" fill={color} opacity="0.25"/>
        <rect x="52" y="20" width="18" height="12" rx="2" fill={color} opacity="0.2"/>
        <rect x="72" y="20" width="18" height="12" rx="2" fill={color} opacity="0.25"/>
        <path d="M14 35h100l-14 22H28L14 35Z" fill={color} opacity="0.28"/>
        <path d="M10 58c8-5 16-5 24 0s16 5 24 0 16-5 24 0 16 5 24 0" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.22"/>
      </svg>
    );
  }
  if (type === 'intermodal') {
    return (
      <svg width="78" height="44" viewBox="0 0 128 72" fill="none">
        <rect x="12" y="24" width="36" height="22" rx="4" fill={color} opacity="0.25"/>
        <rect x="54" y="24" width="36" height="22" rx="4" fill={color} opacity="0.18"/>
        <path d="M92 35h16l8 11v12H92V35Z" fill={color} opacity="0.27"/>
        <circle cx="29" cy="58" r="6" fill={color} opacity="0.32"/>
        <circle cx="105" cy="58" r="6" fill={color} opacity="0.32"/>
        <path d="M48 35h6" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.24"/>
      </svg>
    );
  }
  return (
    <svg width="78" height="44" viewBox="0 0 128 72" fill="none">
      <rect x="10" y="24" width="66" height="28" rx="5" fill={color} opacity="0.26"/>
      <path d="M76 32h22l14 16v4H76V32Z" fill={color} opacity="0.32"/>
      <path d="M96 38h-9v9h17l-8-9Z" fill="#fff" opacity="0.55"/>
      <circle cx="30" cy="57" r="7" fill={color} opacity="0.35"/>
      <circle cx="94" cy="57" r="7" fill={color} opacity="0.35"/>
      <path d="M18 34h44" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.55"/>
    </svg>
  );
}

const cityGeo: Record<string, { lat: number; lon: number }> = {
  Алматы: { lat: 43.2389, lon: 76.8897 },
  Астана: { lat: 51.1694, lon: 71.4491 },
  Шымкент: { lat: 42.3417, lon: 69.5901 },
  Ташкент: { lat: 41.2995, lon: 69.2401 },
  Бишкек: { lat: 42.8746, lon: 74.5698 },
  Актобе: { lat: 50.2839, lon: 57.167 },
  Актау: { lat: 43.6532, lon: 51.1975 },
  Москва: { lat: 55.7558, lon: 37.6173 },
  'Санкт-Петербург': { lat: 59.9311, lon: 30.3609 },
  Париж: { lat: 48.8566, lon: 2.3522 },
  Варшава: { lat: 52.2297, lon: 21.0122 },
  Франкфурт: { lat: 50.1109, lon: 8.6821 },
  Стамбул: { lat: 41.0082, lon: 28.9784 },
  Дубай: { lat: 25.2048, lon: 55.2708 },
  Шанхай: { lat: 31.2304, lon: 121.4737 },
  Пекин: { lat: 39.9042, lon: 116.4074 },
  Урумчи: { lat: 43.8256, lon: 87.6168 },
  'Каспийское море': { lat: 42.0, lon: 51.0 },
};

const keyMapCities = ['Париж', 'Франкфурт', 'Варшава', 'Москва', 'Стамбул', 'Дубай', 'Алматы', 'Астана', 'Ташкент', 'Актау', 'Урумчи', 'Пекин', 'Шанхай'];

function projectGeo({ lat, lon }: { lat: number; lon: number }) {
  return {
    x: ((lon + 180) / 360) * 900,
    y: ((90 - lat) / 180) * 420,
  };
}

const popularCities = [
  { city: 'Алматы', country: 'KZ' },
  { city: 'Астана', country: 'KZ' },
  { city: 'Шымкент', country: 'KZ' },
  { city: 'Актобе', country: 'KZ' },
  { city: 'Актау', country: 'KZ' },
  { city: 'Москва', country: 'RU' },
  { city: 'Ташкент', country: 'UZ' },
  { city: 'Бишкек', country: 'KG' },
  { city: 'Стамбул', country: 'TR' },
  { city: 'Франкфурт', country: 'DE' },
  { city: 'Варшава', country: 'PL' },
  { city: 'Дубай', country: 'AE' },
  { city: 'Шанхай', country: 'CN' },
  { city: 'Пекин', country: 'CN' },
  { city: 'Урумчи', country: 'CN' },
];

interface NewPoint {
  city: string;
  country: string;
  address: string;
  plannedAt: string;
  note: string;
  status: 'passed' | 'current' | 'upcoming';
}

const emptyPoint: NewPoint = {
  city: '',
  country: '',
  address: '',
  plannedAt: '',
  note: '',
  status: 'upcoming',
};

function getPoint(checkpoint: CheckPoint, index: number) {
  const geo = cityGeo[checkpoint.city];
  return geo ? projectGeo(geo) : { x: 500 + index * 45, y: 260 + (index % 2) * 35 };
}

function createRoutePath(checkpoints: CheckPoint[]) {
  if (checkpoints.length === 0) return '';
  return checkpoints
    .map((checkpoint, index) => {
      const point = getPoint(checkpoint, index);
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = getPoint(checkpoints[index - 1], index - 1);
      const midX = (prev.x + point.x) / 2;
      const midY = Math.min(prev.y, point.y) - 45;
      return `Q ${midX} ${midY} ${point.x} ${point.y}`;
    })
    .join(' ');
}

function progressPercent(checkpoints: CheckPoint[]) {
  if (checkpoints.length <= 1) return 0;
  const passed = checkpoints.filter((checkpoint) => checkpoint.status === 'passed').length;
  const current = checkpoints.some((checkpoint) => checkpoint.status === 'current') ? 0.5 : 0;
  return Math.min(100, Math.round(((passed + current) / checkpoints.length) * 100));
}

function WorldMap({ selected }: { selected: Shipment }) {
  const routePath = createRoutePath(selected.checkpoints);
  const routeColor = selected.status === 'delayed' ? '#DC2626' : typeColor[selected.type];

  return (
    <div style={{ background: '#fff', border: '1px solid #E6EAF5', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 950, color: '#111827' }}>Реальная карта мира и маршрут</div>
          <div style={{ fontSize: 12, color: '#8B95A7', marginTop: 3 }}>Города отмечены по координатам, маршрут строится между ключевыми точками</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F1F5F9', color: '#64748B', fontSize: 11, fontWeight: 800 }}>{typeLabel[selected.type]}</span>
          <span style={{ padding: '6px 10px', borderRadius: 999, background: statusBg[selected.status], color: statusColors[selected.status], fontSize: 11, fontWeight: 900 }}>{statusLabel[selected.status]}</span>
        </div>
      </div>

      <div style={{ height: 430, position: 'relative', background: '#EAF2FA' }}>
        <svg width="100%" height="100%" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#DDE7F3" strokeWidth="0.7" />
            </pattern>
          </defs>
          <image
            href="https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1280px-Equirectangular_projection_SW.jpg"
            x="0"
            y="0"
            width="900"
            height="420"
            preserveAspectRatio="xMidYMid slice"
            opacity="0.48"
          />
          <rect width="900" height="420" fill="#EAF2FA" opacity="0.18" />
          <rect width="900" height="420" fill="url(#map-grid)" opacity="0.45" />

          {keyMapCities.map((city) => {
            const geo = cityGeo[city];
            if (!geo) return null;
            const point = projectGeo(geo);
            return (
              <g key={city} opacity="0.82">
                <circle cx={point.x} cy={point.y} r="4.5" fill="#64748B" stroke="#fff" strokeWidth="2" />
                <text x={point.x + 8} y={point.y - 7} fontSize="10" fill="#475569" fontWeight="800">{city}</text>
              </g>
            );
          })}

          <path d={routePath} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
          <path d={routePath} fill="none" stroke={routeColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" strokeDasharray={selected.status === 'planned' ? '10 8' : 'none'} />

          {selected.checkpoints.map((checkpoint, index) => {
            const point = getPoint(checkpoint, index);
            const isCurrent = checkpoint.status === 'current';
            const color = checkpoint.status === 'passed' ? '#059669' : isCurrent ? routeColor : '#CBD5E1';
            return (
              <g key={checkpoint.id}>
                {isCurrent && <circle cx={point.x} cy={point.y} r="22" fill={routeColor} opacity="0.16" />}
                <circle cx={point.x} cy={point.y} r="11" fill={color} stroke="#fff" strokeWidth="4" />
                <text x={point.x} y={point.y - 18} textAnchor="middle" fontSize="12" fill="#334155" fontWeight="900">{checkpoint.city}</text>
                <text x={point.x} y={point.y + 28} textAnchor="middle" fontSize="10" fill="#64748B" fontWeight="700">{checkpoint.country}</text>
              </g>
            );
          })}

          {selected.status === 'in_transit' && selected.checkpoints.length > 1 && (() => {
            const first = getPoint(selected.checkpoints[0], 0);
            const last = getPoint(selected.checkpoints[selected.checkpoints.length - 1], selected.checkpoints.length - 1);
            const x = first.x + (last.x - first.x) * 0.55;
            const y = first.y + (last.y - first.y) * 0.55 - 35;
            return (
              <g>
                <circle cx={x} cy={y} r="18" fill="#fff" opacity="0.95" />
                <text x={x} y={y + 6} textAnchor="middle" fontSize="20">{selected.type === 'air' ? '✈' : selected.type === 'sea' ? '🚢' : '🚛'}</text>
              </g>
            );
          })()}
        </svg>

        <div style={{ position: 'absolute', left: 18, bottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Пройдена', color: '#059669' },
            { label: 'Текущая', color: routeColor },
            { label: 'Плановая', color: '#CBD5E1' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.9)', border: '1px solid #E2E8F0', padding: '7px 10px', borderRadius: 999 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 800 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Tracking() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkpointUpdatingId, setCheckpointUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [checkpointErrors, setCheckpointErrors] = useState<string[]>([]);
  const [newPoint, setNewPoint] = useState<NewPoint>(emptyPoint);
  const [citySearch, setCitySearch] = useState('');
  const [insertAfter, setInsertAfter] = useState<number>(-1);

  const refreshTracking = async (keepSelectedId?: string) => {
    const { shipments: data } = await getTrackingData();
    const mapped = data.map((s) => ({ ...s, checkpoints: [...s.checkpoints] }));
    setAllShipments(mapped);
    const selectedId = keepSelectedId ?? selected?.id;
    setSelected(mapped.find((s) => s.id === selectedId) ?? mapped[0] ?? null);
  };

  useEffect(() => {
    getTrackingData()
      .then(({ shipments: data }) => {
        const mapped = data.map((s) => ({ ...s, checkpoints: [...s.checkpoints] }));
        setAllShipments(mapped);
        setSelected(mapped[1] ?? mapped[0] ?? null);
      })
      .catch((error) => {
        setLoadError(getApiErrorMessage(error, 'Не удалось загрузить данные отслеживания.'));
      })
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => allShipments.filter((shipment) =>
    !query
    || shipment.trackingNumber.toLowerCase().includes(query.toLowerCase())
    || shipment.origin.toLowerCase().includes(query.toLowerCase())
    || shipment.destination.toLowerCase().includes(query.toLowerCase())
  ), [allShipments, query]);

  const filteredCities = popularCities.filter((city) =>
    city.city.toLowerCase().includes(citySearch.toLowerCase())
    || city.country.toLowerCase().includes(citySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 10, color: '#8B95A7', fontSize: 14, fontWeight: 700 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB',
          animation: 'spin 0.7s linear infinite',
        }} />
        Загрузка...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError && allShipments.length === 0) {
    return <ApiLoadErrorBanner message={loadError} />;
  }

  if (!selected) return null;

  const client = clients.find((item) => item.id === selected.clientId);
  const manager = managers.find((item) => item.id === selected.managerId);
  const progress = progressPercent(selected.checkpoints);

  const handleAddPoint = async () => {
    if (!selected || !newPoint.city || !newPoint.address) return;

    setSubmitting(true);
    setCheckpointErrors([]);
    setSuccessMessage('');

    try {
      await addShipmentCheckpoint(selected.id, {
        city: newPoint.city.trim(),
        country: newPoint.country.trim() || undefined,
        address: newPoint.address.trim(),
        plannedAt: toPlannedAt(newPoint.plannedAt),
        status: newPoint.status,
        note: newPoint.note.trim() || undefined,
        insertAfter,
      });
      await refreshTracking(selected.id);
      setSuccessMessage(`Точка ${newPoint.city} добавлена в маршрут ${selected.trackingNumber}`);
      setShowAddModal(false);
      setNewPoint(emptyPoint);
      setCitySearch('');
      setInsertAfter(-1);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setCheckpointErrors(formatFieldErrors(error.validationErrors));
      } else if (error instanceof ApiError) {
        setCheckpointErrors([error.message]);
      } else {
        setCheckpointErrors(['Не удалось добавить точку. Проверьте подключение к API.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckpointStatusChange = async (checkpointId: string, status: CheckPoint['status']) => {
    if (!selected) return;

    setCheckpointUpdatingId(checkpointId);
    setCheckpointErrors([]);
    setSuccessMessage('');

    try {
      await updateCheckpoint(checkpointId, { status });
      await refreshTracking(selected.id);
      setSuccessMessage('Статус точки маршрута обновлён');
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setCheckpointErrors(formatFieldErrors(error.validationErrors));
      } else if (error instanceof ApiError) {
        setCheckpointErrors([error.message]);
      } else {
        setCheckpointErrors(['Не удалось обновить точку. Проверьте подключение к API.']);
      }
    } finally {
      setCheckpointUpdatingId(null);
    }
  };

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16, background: '#EEF0FB', minHeight: '100%' }}>
      {successMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#15803D',
          fontSize: 13,
          fontWeight: 700,
        }}>
          {successMessage}
        </div>
      )}

      {checkpointErrors.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {checkpointErrors.map((error) => <div key={error}>{error}</div>)}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid #E6EAF5', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', borderRadius: 12, padding: '10px 13px', border: '1px solid #E2E8F0' }}>
          <Search size={16} color="#94A3B8" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по номеру, клиенту, городу или направлению..."
            style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#0F172A', outline: 'none', flex: 1 }}
          />
        </div>
        <button style={{ padding: '10px 24px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
          Найти
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '390px 1fr', gap: 16, alignItems: 'flex-start' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '0 4px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, color: '#111827', fontWeight: 950 }}>Активные отправления</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Читаемый список грузов с прогрессом</div>
            </div>
            <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 900, background: '#DBEAFE', padding: '5px 9px', borderRadius: 999 }}>{results.length} грузов</span>
          </div>

          {results.map((shipment) => {
            const shipmentClient = clients.find((item) => item.id === shipment.clientId);
            const shipmentManager = managers.find((item) => item.id === shipment.managerId);
            const currentPoint = shipment.checkpoints.find((point) => point.status === 'current') || shipment.checkpoints[shipment.checkpoints.length - 1];
            const selectedCard = selected.id === shipment.id;
            const shipmentProgress = progressPercent(shipment.checkpoints);
            const color = statusColors[shipment.status];

            return (
              <button
                key={shipment.id}
                onClick={() => setSelected(shipment)}
                style={{
                  textAlign: 'left',
                  background: '#fff',
                  border: `2px solid ${selectedCard ? '#2563EB' : '#E6EAF5'}`,
                  borderRadius: 18,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  boxShadow: selectedCard ? '0 0 0 4px rgba(37,99,235,0.1)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', right: 18, top: 48, opacity: selectedCard ? 0.95 : 0.75, pointerEvents: 'none' }}>
                  <TransportIcon type={shipment.type} color={typeColor[shipment.type]} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: 15, color: '#111827', fontWeight: 950, letterSpacing: -0.3 }}>{shipment.trackingNumber}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: 700 }}>
                      {shipment.origin} → {shipment.destination}
                    </div>
                  </div>
                  <span style={{ padding: '5px 10px', borderRadius: 999, background: statusBg[shipment.status], color, fontSize: 11, fontWeight: 900 }}>
                    {statusLabel[shipment.status]}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 13, position: 'relative', zIndex: 1 }}>
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>Клиент</div>
                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 900, marginTop: 2 }}>{shipmentClient?.company}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>Менеджер</div>
                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 900, marginTop: 2 }}>{shipmentManager?.name.split(' ').slice(0, 2).join(' ')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 13, color: '#64748B', fontSize: 11, fontWeight: 700, position: 'relative', zIndex: 1 }}>
                  <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><MapPin size={12} /> Сейчас: {currentPoint?.city}</span>
                  <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><CalendarDays size={12} /> ETA: {shipment.estimatedDelivery}</span>
                </div>

                <div style={{ marginTop: 12, position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>{pluralPoints(shipment.checkpoints.length)}</span>
                    <span style={{ fontSize: 10, color, fontWeight: 900 }}>{shipmentProgress}%</span>
                  </div>
                  <div style={{ height: 7, background: '#EEF2F7', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${shipmentProgress}%`, height: '100%', borderRadius: 999, background: color }} />
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #E6EAF5', borderRadius: 18, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: statusBg[selected.status], color: statusColors[selected.status], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TransportIcon type={selected.type} color={typeColor[selected.type]} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, color: '#111827', fontWeight: 950 }}>{selected.trackingNumber}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                      {typeLabel[selected.type]} · {selected.cargo} · {selected.weight}
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckpointErrors([]);
                  setSuccessMessage('');
                  setShowAddModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}
              >
                <Plus size={15} />
                Добавить точку
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
              {[
                { label: 'Клиент', value: client?.company },
                { label: 'Менеджер', value: manager?.name },
                { label: 'Направление', value: `${selected.origin} → ${selected.destination}` },
                { label: 'Прогресс', value: `${progress}%` },
              ].map((item) => (
                <div key={item.label} style={{ background: '#F8FAFC', border: '1px solid #EEF2F7', borderRadius: 12, padding: '11px 12px' }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: '#111827', fontWeight: 900, marginTop: 5 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
              {[
                { label: 'Цена груза', value: '$10,000', color: '#111827', bg: '#F8FAFC' },
                { label: 'Оплачено', value: '$5,000', color: '#059669', bg: '#ECFDF5' },
                { label: 'Долг клиента', value: '$5,000', color: '#DC2626', bg: '#FEF2F2' },
              ].map((item) => (
                <div key={item.label} style={{ background: item.bg, border: '1px solid #EEF2F7', borderRadius: 12, padding: '12px 13px' }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: 18, color: item.color, fontWeight: 950, marginTop: 4 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <WorldMap selected={selected} />

          <div style={{ background: '#fff', border: '1px solid #E6EAF5', borderRadius: 18, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 17, color: '#111827', fontWeight: 950 }}>Маршрут и контрольные точки</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>На каждой точке фиксируется Telegram-пуш и финансовая привязка к грузу</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: '#E0F2FE', color: '#0369A1', fontSize: 11, fontWeight: 900 }}>{selected.checkpoints.filter((point) => point.status !== 'upcoming').length} TG-пушей</span>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F1F5F9', color: '#64748B', fontSize: 11, fontWeight: 900 }}>{pluralPoints(selected.checkpoints.length)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {selected.checkpoints.map((checkpoint, index) => {
                const isCurrent = checkpoint.status === 'current';
                const isPassed = checkpoint.status === 'passed';
                const dotColor = isPassed ? '#059669' : isCurrent ? statusColors[selected.status] : '#CBD5E1';
                const telegramSent = isPassed || isCurrent;
                const telegramText = isPassed ? 'Пуш отправлен' : isCurrent ? 'Пуш отправлен менеджеру' : 'Ожидает события';
                return (
                  <div key={checkpoint.id} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 210px', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: isCurrent ? '#fff' : dotColor, border: `4px solid ${dotColor}`, marginTop: 2 }} />
                      {index < selected.checkpoints.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 42, background: isPassed ? '#A7F3D0' : '#E2E8F0', margin: '4px 0' }} />}
                    </div>
                    <div style={{ paddingBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 14, color: '#111827', fontWeight: 950 }}>{checkpoint.city}, {checkpoint.country}</div>
                        <select
                          value={checkpoint.status}
                          disabled={checkpointUpdatingId === checkpoint.id}
                          onChange={(event) => void handleCheckpointStatusChange(checkpoint.id, event.target.value as CheckPoint['status'])}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 999,
                            border: 'none',
                            background: isPassed ? '#D1FAE5' : isCurrent ? '#DBEAFE' : '#F1F5F9',
                            color: isPassed ? '#047857' : isCurrent ? '#1D4ED8' : '#64748B',
                            fontSize: 10,
                            fontWeight: 900,
                            cursor: checkpointUpdatingId === checkpoint.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="upcoming">Плановая</option>
                          <option value="current">Текущая</option>
                          <option value="passed">Пройдена</option>
                        </select>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{checkpoint.address}</div>
                      {checkpoint.note && (
                        <div style={{ display: 'inline-flex', marginTop: 8, padding: '5px 9px', borderRadius: 8, background: '#FFFBEB', color: '#B45309', fontSize: 11, fontWeight: 800 }}>
                          {checkpoint.note}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', paddingTop: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ color: isPassed ? '#059669' : '#94A3B8', fontSize: 12, fontWeight: 900 }}>
                      {checkpoint.arrivedAt ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Check size={13} />{checkpoint.arrivedAt}</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock3 size={13} />{checkpoint.plannedAt}</span>
                      )}
                      </div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 9px',
                        borderRadius: 999,
                        background: telegramSent ? '#E0F2FE' : '#F1F5F9',
                        color: telegramSent ? '#0369A1' : '#94A3B8',
                        fontSize: 10,
                        fontWeight: 900,
                        border: `1px solid ${telegramSent ? '#BAE6FD' : '#E2E8F0'}`,
                      }}>
                        <Send size={11} />
                        Telegram: {telegramText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setCheckpointErrors([]);
                setSuccessMessage('');
                setShowAddModal(true);
              }}
              style={{ width: '100%', marginTop: 4, padding: '14px 16px', borderRadius: 14, border: '2px dashed #BFDBFE', background: '#F0F7FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 900, cursor: 'pointer' }}
            >
              <Plus size={16} />
              Добавить новую точку маршрута
            </button>
          </div>
        </section>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 220, backdropFilter: 'blur(3px)', padding: 24 }}>
          <div style={{ width: 1040, maxWidth: '96vw', background: '#fff', borderRadius: 22, maxHeight: '92vh', overflowY: 'auto', border: '1px solid #E5E7EB' }}>
            <div style={{ padding: '26px 30px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 21, color: '#111827', fontWeight: 950, letterSpacing: -0.4 }}>Добавить точку маршрута</div>
                <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>Груз: <strong style={{ color: '#2563EB' }}>{selected.trackingNumber}</strong> · {selected.origin} → {selected.destination}</div>
              </div>
              <button type="button" onClick={() => !submitting && setShowAddModal(false)} disabled={submitting} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: '#F8FAFC', color: '#64748B', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={19} /></button>
            </div>

            {checkpointErrors.length > 0 && (
              <div style={{
                margin: '0 30px',
                padding: '12px 16px',
                borderRadius: 10,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: 13,
                fontWeight: 600,
              }}>
                {checkpointErrors.map((error) => <div key={error}>{error}</div>)}
              </div>
            )}

            <div style={{ padding: '22px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <section style={{ background: '#F7F8FA', borderRadius: 18, padding: '18px', border: '1px solid #EEF2F7' }}>
                  <div style={{ fontSize: 14, color: '#111827', fontWeight: 950, marginBottom: 12 }}>Быстрый выбор города</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
                    <Search size={16} color="#94A3B8" />
                    <input value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="Алматы, Дубай, Шанхай..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: 14, color: '#111827' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {filteredCities.map((item) => (
                      <button
                        key={`${item.city}-${item.country}`}
                        onClick={() => setNewPoint((current) => ({ ...current, city: item.city, country: item.country }))}
                        style={{ border: `1px solid ${newPoint.city === item.city ? '#2563EB' : '#E2E8F0'}`, background: newPoint.city === item.city ? '#DBEAFE' : '#fff', color: newPoint.city === item.city ? '#1D4ED8' : '#64748B', padding: '8px 13px', borderRadius: 999, fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
                      >
                        {item.city} <span style={{ opacity: 0.55 }}>{item.country}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section style={{ background: '#F7F8FA', borderRadius: 18, padding: '18px', border: '1px solid #EEF2F7' }}>
                  <div style={{ fontSize: 14, color: '#111827', fontWeight: 950, marginBottom: 12 }}>Позиция в маршруте</div>
                  <label>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, marginBottom: 7, textTransform: 'uppercase' }}>Вставить после точки</div>
                    <select value={insertAfter} onChange={(event) => setInsertAfter(Number(event.target.value))} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 14, padding: '13px 14px', outline: 'none', fontSize: 14, background: '#fff', color: '#111827' }}>
                      <option value={-1}>В конец маршрута</option>
                      {selected.checkpoints.map((point, index) => <option key={point.id} value={index}>После: {point.city}, {point.country}</option>)}
                    </select>
                  </label>
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {selected.checkpoints.slice(0, 4).map((point, index) => (
                      <div key={point.id} style={{ background: '#fff', borderRadius: 12, padding: '10px 12px', border: '1px solid #EEF2F7' }}>
                        <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 900 }}>#{index + 1}</div>
                        <div style={{ fontSize: 12, color: '#111827', fontWeight: 900, marginTop: 2 }}>{point.city}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section style={{ background: '#F7F8FA', borderRadius: 18, padding: '18px', border: '1px solid #EEF2F7' }}>
                <div style={{ fontSize: 14, color: '#111827', fontWeight: 950, marginBottom: 14 }}>Данные новой точки</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, marginBottom: 7, textTransform: 'uppercase' }}>Город *</div>
                    <input value={newPoint.city} onChange={(event) => setNewPoint((current) => ({ ...current, city: event.target.value }))} placeholder="например: Алматы" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 14, padding: '13px 14px', outline: 'none', fontSize: 14, background: '#fff' }} />
                  </label>
                  <label>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, marginBottom: 7, textTransform: 'uppercase' }}>Страна / код</div>
                    <input value={newPoint.country} onChange={(event) => setNewPoint((current) => ({ ...current, country: event.target.value }))} placeholder="KZ, RU, DE..." style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 14, padding: '13px 14px', outline: 'none', fontSize: 14, background: '#fff' }} />
                  </label>
                </div>
                <label style={{ display: 'block', marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, marginBottom: 7, textTransform: 'uppercase' }}>Адрес / терминал / склад *</div>
                  <input value={newPoint.address} onChange={(event) => setNewPoint((current) => ({ ...current, address: event.target.value }))} placeholder="Полный адрес, название терминала или таможенного поста" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 14, padding: '13px 14px', outline: 'none', fontSize: 14, background: '#fff' }} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <label>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, marginBottom: 7, textTransform: 'uppercase' }}>Плановое время прибытия</div>
                    <input type="datetime-local" value={newPoint.plannedAt} onChange={(event) => setNewPoint((current) => ({ ...current, plannedAt: event.target.value }))} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 14, padding: '13px 14px', outline: 'none', fontSize: 14, background: '#fff' }} />
                  </label>
                  <label>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, marginBottom: 7, textTransform: 'uppercase' }}>Статус точки</div>
                    <select value={newPoint.status} onChange={(event) => setNewPoint((current) => ({ ...current, status: event.target.value as NewPoint['status'] }))} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 14, padding: '13px 14px', outline: 'none', fontSize: 14, background: '#fff' }}>
                      <option value="upcoming">Предстоящая</option>
                      <option value="current">Текущая</option>
                      <option value="passed">Пройдена</option>
                    </select>
                  </label>
                </div>
                <label style={{ display: 'block', marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, marginBottom: 7, textTransform: 'uppercase' }}>Примечание</div>
                  <textarea value={newPoint.note} onChange={(event) => setNewPoint((current) => ({ ...current, note: event.target.value }))} rows={3} placeholder="Задержка, особые условия, контактное лицо на точке..." style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 14, padding: '13px 14px', outline: 'none', fontSize: 14, resize: 'none', fontFamily: 'inherit', background: '#fff' }} />
                </label>
              </section>

              {(newPoint.city || newPoint.address) && (
                <div style={{ background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <CircleDollarSign size={20} color="#2563EB" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 950, color: '#111827' }}>{newPoint.city || 'Новая точка'}{newPoint.country ? `, ${newPoint.country}` : ''}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{newPoint.address || 'Адрес еще не указан'}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
                <button type="button" onClick={() => !submitting && setShowAddModal(false)} disabled={submitting} style={{ minWidth: 138, padding: '13px 22px', border: '1px solid #E2E8F0', background: '#fff', borderRadius: 14, fontWeight: 900, color: '#64748B', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14 }}>Отмена</button>
                <button
                  type="button"
                  onClick={() => void handleAddPoint()}
                  disabled={submitting || !newPoint.city || !newPoint.address}
                  style={{
                    minWidth: 230,
                    padding: '13px 22px',
                    border: 'none',
                    background: submitting || !newPoint.city || !newPoint.address ? '#E2E8F0' : '#2563EB',
                    color: submitting || !newPoint.city || !newPoint.address ? '#94A3B8' : '#fff',
                    borderRadius: 14,
                    fontWeight: 950,
                    cursor: submitting || !newPoint.city || !newPoint.address ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {submitting && (
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    }} />
                  )}
                  {submitting ? 'Сохранение...' : '+ Добавить точку в маршрут'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { Client, Manager, Shipment, ShipmentStatus, TransportType } from '../data/mock';
import { ApiError, createShipment, deleteShipment, getClients, getManagers, getShipments, updateShipment, updateShipmentStatus } from '../api';
import type { CreateShipmentPayload, UpdateShipmentPayload } from '../types/api';

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
const stepKeys: ShipmentStatus[] = ['planned', 'in_transit', 'at_checkpoint', 'delivered'];

const statusOptions: { value: ShipmentStatus; label: string }[] = [
  { value: 'planned', label: 'Запланирован' },
  { value: 'in_transit', label: 'В пути' },
  { value: 'at_checkpoint', label: 'На пункте' },
  { value: 'delivered', label: 'Доставлен' },
  { value: 'delayed', label: 'Задержка' },
];

const transportTypes: { value: TransportType; label: string }[] = [
  { value: 'auto', label: 'Авто' },
  { value: 'air', label: 'Авиа' },
  { value: 'sea', label: 'Море' },
  { value: 'intermodal', label: 'Интермодал' },
];

interface CreateFormState {
  clientId: string;
  managerId: string;
  type: TransportType;
  origin: string;
  destination: string;
  cargo: string;
  weight: string;
  volume: string;
  estimatedDelivery: string;
  telegramNotifications: boolean;
}

const emptyCreateForm: CreateFormState = {
  clientId: '',
  managerId: '',
  type: 'auto',
  origin: '',
  destination: '',
  cargo: '',
  weight: '',
  volume: '',
  estimatedDelivery: '',
  telegramNotifications: false,
};

interface EditFormState {
  clientId: string;
  managerId: string;
  type: TransportType;
  origin: string;
  destination: string;
  cargo: string;
  weight: string;
  weightUnit: string;
  volume: string;
  volumeUnit: string;
  plannedPickup: string;
  estimatedDelivery: string;
  notes: string;
  telegramNotifications: boolean;
}

function shipmentToEditForm(shipment: Shipment): EditFormState {
  return {
    clientId: shipment.clientId,
    managerId: shipment.managerId ?? '',
    type: shipment.type,
    origin: shipment.origin,
    destination: shipment.destination,
    cargo: shipment.cargo ?? '',
    weight: shipment.weight ?? '',
    weightUnit: shipment.weightUnit ?? '',
    volume: shipment.volume ?? '',
    volumeUnit: shipment.volumeUnit ?? '',
    plannedPickup: shipment.plannedPickup ?? '',
    estimatedDelivery: shipment.estimatedDelivery ?? '',
    notes: shipment.notes ?? '',
    telegramNotifications: shipment.telegramNotifications,
  };
}

const fieldLabels: Record<string, string> = {
  clientId: 'Клиент',
  managerId: 'Менеджер',
  type: 'Тип перевозки',
  origin: 'Откуда',
  destination: 'Куда',
  cargo: 'Груз',
  weight: 'Вес',
  volume: 'Объём',
  estimatedDelivery: 'Плановая дата',
  status: 'Статус',
  note: 'Комментарий',
};

function formatFieldErrors(errors: Record<string, string[]>): string[] {
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((message) => {
      const label = fieldLabels[field] ?? field;
      return `${label}: ${message}`;
    }),
  );
}

function pluralPoints(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} точка`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} точки`;
  return `${n} точек`;
}

export default function Shipments() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState<ShipmentStatus>('planned');
  const [statusNote, setStatusNote] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState('');
  const [statusUpdateErrors, setStatusUpdateErrors] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);

  const refreshClients = async () => {
    const { clients: data } = await getClients();
    setClients(data);
  };

  useEffect(() => {
    Promise.all([getShipments(), getManagers(), getClients()])
      .then(([shipmentsRes, managersRes, clientsRes]) => {
        setShipments(shipmentsRes.shipments);
        setManagers(managersRes.managers);
        setClients(clientsRes.clients);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) {
      setStatusDraft(selected.status);
      setStatusNote('');
      setStatusUpdateErrors([]);
      setStatusSuccessMessage('');
      setEditMode(false);
      setEditForm(shipmentToEditForm(selected));
      setEditErrors([]);
      setShowDeleteConfirm(false);
      setDeleteErrors([]);
    } else {
      setEditMode(false);
      setEditForm(null);
      setShowDeleteConfirm(false);
    }
  }, [selected?.id]);

  const mergeShipment = (shipment: Shipment) => {
    setShipments((current) => current.map((item) => (item.id === shipment.id ? shipment : item)));
    setSelected(shipment);
  };

  const handleStatusUpdate = async (status: ShipmentStatus, note?: string) => {
    if (!selected) return;

    setStatusUpdating(true);
    setStatusUpdateErrors([]);
    setStatusSuccessMessage('');
    setSuccessMessage('');

    try {
      const { shipment } = await updateShipmentStatus(selected.id, {
        status,
        note: note?.trim() || undefined,
      });
      mergeShipment(shipment);
      setStatusDraft(shipment.status);
      setStatusNote('');
      setStatusSuccessMessage(`Статус ${shipment.trackingNumber} обновлён: ${statusLabel[shipment.status]}`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setStatusUpdateErrors(formatFieldErrors(error.validationErrors));
      } else if (error instanceof ApiError) {
        setStatusUpdateErrors([error.message]);
      } else {
        setStatusUpdateErrors(['Не удалось обновить статус. Проверьте подключение к API.']);
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const openEditForm = () => {
    if (!selected) return;
    setEditForm(shipmentToEditForm(selected));
    setEditErrors([]);
    setShowDeleteConfirm(false);
    setEditMode(true);
  };

  const closeEditForm = () => {
    if (editSubmitting) return;
    setEditMode(false);
    setEditErrors([]);
    if (selected) {
      setEditForm(shipmentToEditForm(selected));
    }
  };

  const handleEditSubmit = async () => {
    if (!selected || !editForm) return;

    setEditSubmitting(true);
    setEditErrors([]);
    setSuccessMessage('');
    setStatusSuccessMessage('');

    const payload: UpdateShipmentPayload = {
      clientId: Number(editForm.clientId),
      managerId: editForm.managerId ? Number(editForm.managerId) : null,
      type: editForm.type,
      origin: editForm.origin.trim(),
      destination: editForm.destination.trim(),
      cargo: editForm.cargo.trim() || undefined,
      weight: editForm.weight.trim() || undefined,
      weightUnit: editForm.weightUnit.trim() || undefined,
      volume: editForm.volume.trim() || undefined,
      volumeUnit: editForm.volumeUnit.trim() || undefined,
      plannedPickup: editForm.plannedPickup || undefined,
      estimatedDelivery: editForm.estimatedDelivery || undefined,
      notes: editForm.notes.trim() || undefined,
      telegramNotifications: editForm.telegramNotifications,
    };

    try {
      const { shipment } = await updateShipment(selected.id, payload);
      mergeShipment(shipment);
      setEditMode(false);
      setEditForm(shipmentToEditForm(shipment));
      setSuccessMessage(`Груз ${shipment.trackingNumber} обновлён`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setEditErrors(formatFieldErrors(error.validationErrors));
      } else if (error instanceof ApiError) {
        setEditErrors([error.message]);
      } else {
        setEditErrors(['Не удалось обновить груз. Проверьте подключение к API.']);
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selected) return;

    const deletedId = selected.id;
    const deletedTracking = selected.trackingNumber;

    setDeleteSubmitting(true);
    setDeleteErrors([]);
    setSuccessMessage('');
    setStatusSuccessMessage('');

    try {
      await deleteShipment(deletedId);
      const remaining = shipments.filter((item) => item.id !== deletedId);
      setShipments(remaining);
      setSelected(null);
      setEditMode(false);
      setShowDeleteConfirm(false);
      setSuccessMessage(`Груз ${deletedTracking} удалён`);
    } catch (error) {
      if (error instanceof ApiError) {
        setDeleteErrors([error.message]);
      } else {
        setDeleteErrors(['Не удалось удалить груз. Проверьте подключение к API.']);
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openCreateForm = () => {
    setCreateForm(emptyCreateForm);
    setFormErrors([]);
    setSuccessMessage('');
    setStatusSuccessMessage('');
    void refreshClients();
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    if (submitting) return;
    setShowCreateForm(false);
    setFormErrors([]);
  };

  const handleCreateSubmit = async () => {
    setSubmitting(true);
    setFormErrors([]);
    setSuccessMessage('');
    setStatusSuccessMessage('');

    const payload: CreateShipmentPayload = {
      clientId: Number(createForm.clientId),
      managerId: createForm.managerId ? Number(createForm.managerId) : undefined,
      type: createForm.type,
      origin: createForm.origin.trim(),
      destination: createForm.destination.trim(),
      cargo: createForm.cargo.trim() || undefined,
      weight: createForm.weight.trim() || undefined,
      volume: createForm.volume.trim() || undefined,
      estimatedDelivery: createForm.estimatedDelivery || undefined,
      telegramNotifications: createForm.telegramNotifications,
    };

    if (payload.origin && payload.destination) {
      const plannedAt = createForm.estimatedDelivery
        ? `${createForm.estimatedDelivery} 09:00`
        : new Date().toISOString().slice(0, 16).replace('T', ' ');
      payload.checkpoints = [
        {
          city: payload.origin,
          country: '',
          address: payload.origin,
          plannedAt,
          status: 'upcoming',
        },
        {
          city: payload.destination,
          country: '',
          address: payload.destination,
          plannedAt,
          status: 'upcoming',
        },
      ];
    }

    try {
      const { shipment } = await createShipment(payload);
      setShipments((current) => [shipment, ...current]);
      setSelected(shipment);
      setShowCreateForm(false);
      setCreateForm(emptyCreateForm);
      setSuccessMessage(`Груз ${shipment.trackingNumber} успешно создан`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors));
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось создать груз. Проверьте подключение к API.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

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

      {(successMessage || statusSuccessMessage) && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#15803D',
          fontSize: 13,
          fontWeight: 700,
        }}>
          {successMessage || statusSuccessMessage}
        </div>
      )}

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
          <button
            type="button"
            onClick={openCreateForm}
            style={{
              padding: '9px 20px', background: '#3B82F6', color: '#fff',
              border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
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
                    {(s.weight || s.volume) && (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        {[s.weight, s.volume].filter(Boolean).join(' · ')}
                      </div>
                    )}
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
                        <div
                          key={step}
                          role={isSelected ? 'button' : undefined}
                          tabIndex={isSelected ? 0 : undefined}
                          onClick={(event) => {
                            if (!isSelected || statusUpdating) return;
                            event.stopPropagation();
                            void handleStatusUpdate(step);
                          }}
                          onKeyDown={(event) => {
                            if (!isSelected || statusUpdating) return;
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleStatusUpdate(step);
                            }
                          }}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: i === 0 ? 'flex-start' : i === stepKeys.length - 1 ? 'flex-end' : 'center',
                            cursor: isSelected && !statusUpdating ? 'pointer' : 'default',
                          }}
                        >
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
              <button type="button" onClick={() => setSelected(null)} style={{
                background: '#F1F5F9', border: 'none', cursor: 'pointer',
                width: 28, height: 28, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', fontSize: 16, fontWeight: 700,
              }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                onClick={openEditForm}
                disabled={editSubmitting || deleteSubmitting || showDeleteConfirm}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #BFDBFE',
                  background: editMode ? '#DBEAFE' : '#F0F7FF', color: '#1D4ED8',
                  fontSize: 12, fontWeight: 700, cursor: editSubmitting || deleteSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                Редактировать
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setEditMode(false);
                  setDeleteErrors([]);
                }}
                disabled={editSubmitting || deleteSubmitting}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #FECACA',
                  background: '#FEF2F2', color: '#B91C1C',
                  fontSize: 12, fontWeight: 700, cursor: editSubmitting || deleteSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                Удалить
              </button>
            </div>

            {showDeleteConfirm && (
              <div style={{ marginBottom: 14, padding: '12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>
                  Удалить груз {selected.trackingNumber}? Это действие нельзя отменить.
                </div>
                {deleteErrors.length > 0 && (
                  <div style={{ fontSize: 11, color: '#B91C1C', marginBottom: 8 }}>
                    {deleteErrors.map((error) => <div key={error}>{error}</div>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!deleteSubmitting) setShowDeleteConfirm(false);
                    }}
                    disabled={deleteSubmitting}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                      background: '#fff', color: '#64748B', fontSize: 12, fontWeight: 600,
                      cursor: deleteSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteConfirm()}
                    disabled={deleteSubmitting}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: deleteSubmitting ? '#94A3B8' : '#DC2626', color: '#fff',
                      fontSize: 12, fontWeight: 700, cursor: deleteSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {deleteSubmitting ? 'Удаление...' : 'Да, удалить'}
                  </button>
                </div>
              </div>
            )}

            {editMode && editForm ? (
              <div style={{ marginBottom: 18, padding: '14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Редактирование груза</div>

                {editErrors.length > 0 && (
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 11, marginBottom: 10 }}>
                    {editErrors.map((error) => <div key={error}>{error}</div>)}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Клиент *</div>
                    <select
                      value={editForm.clientId}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, clientId: e.target.value }))}
                      disabled={editSubmitting}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                    >
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
                    </select>
                  </label>

                  <label>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Менеджер</div>
                    <select
                      value={editForm.managerId}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, managerId: e.target.value }))}
                      disabled={editSubmitting}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                    >
                      <option value="">Не назначен</option>
                      {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>

                  <label>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Тип перевозки *</div>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, type: e.target.value as TransportType }))}
                      disabled={editSubmitting}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                    >
                      {transportTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Откуда *</div>
                      <input
                        value={editForm.origin}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, origin: e.target.value }))}
                        disabled={editSubmitting}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                      />
                    </label>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Куда *</div>
                      <input
                        value={editForm.destination}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, destination: e.target.value }))}
                        disabled={editSubmitting}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                      />
                    </label>
                  </div>

                  <label>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Груз</div>
                    <input
                      value={editForm.cargo}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, cargo: e.target.value }))}
                      disabled={editSubmitting}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Вес</div>
                      <input
                        value={editForm.weight}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, weight: e.target.value }))}
                        disabled={editSubmitting}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                      />
                    </label>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Ед. веса</div>
                      <input
                        value={editForm.weightUnit}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, weightUnit: e.target.value }))}
                        disabled={editSubmitting}
                        placeholder="kg"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Объём</div>
                      <input
                        value={editForm.volume}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, volume: e.target.value }))}
                        disabled={editSubmitting}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                      />
                    </label>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Ед. объёма</div>
                      <input
                        value={editForm.volumeUnit}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, volumeUnit: e.target.value }))}
                        disabled={editSubmitting}
                        placeholder="m3"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Плановый забор</div>
                      <input
                        type="date"
                        value={editForm.plannedPickup}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, plannedPickup: e.target.value }))}
                        disabled={editSubmitting}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                      />
                    </label>
                    <label>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Плановая доставка</div>
                      <input
                        type="date"
                        value={editForm.estimatedDelivery}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, estimatedDelivery: e.target.value }))}
                        disabled={editSubmitting}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                      />
                    </label>
                  </div>

                  <label>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Примечание</div>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, notes: e.target.value }))}
                      disabled={editSubmitting}
                      rows={2}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={closeEditForm} disabled={editSubmitting} style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                    background: '#fff', color: '#64748B', fontSize: 12, fontWeight: 600,
                    cursor: editSubmitting ? 'not-allowed' : 'pointer',
                  }}>
                    Отмена
                  </button>
                  <button type="button" onClick={() => void handleEditSubmit()} disabled={editSubmitting} style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: editSubmitting ? '#94A3B8' : '#3B82F6', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: editSubmitting ? 'not-allowed' : 'pointer',
                  }}>
                    {editSubmitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {[
                { icon: '🏢', label: 'Клиент', value: clients.find(c => c.id === selected.clientId)?.company },
                { icon: '👤', label: 'Менеджер', value: managers.find(m => m.id === selected.managerId)?.name },
                { icon: '📦', label: 'Груз', value: selected.cargo },
                { icon: '⚖', label: 'Вес / Объём', value: [selected.weight, selected.volume].filter(Boolean).join(' · ') || undefined },
                { icon: '📅', label: 'Плановая дата', value: selected.estimatedDelivery },
              ].filter(({ value }) => value).map(({ icon, label, value }) => (
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
            )}

            <div style={{ marginBottom: 18, padding: '14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Обновить статус</div>

              {statusUpdateErrors.length > 0 && (
                <div style={{ padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 11, marginBottom: 10 }}>
                  {statusUpdateErrors.map((error) => <div key={error}>{error}</div>)}
                </div>
              )}

              <label style={{ display: 'block', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Статус</div>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as ShipmentStatus)}
                  disabled={statusUpdating}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                >
                  {statusOptions.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'block', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Комментарий</div>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  disabled={statusUpdating}
                  rows={2}
                  placeholder="Необязательно"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />
              </label>

              <button
                type="button"
                onClick={() => void handleStatusUpdate(statusDraft, statusNote)}
                disabled={statusUpdating}
                style={{
                  width: '100%', padding: '9px 14px', background: statusUpdating ? '#94A3B8' : '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12,
                  cursor: statusUpdating ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {statusUpdating && (
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite', display: 'inline-block',
                  }} />
                )}
                {statusUpdating ? 'Сохранение...' : 'Сохранить статус'}
              </button>
            </div>

            {/* Route timeline */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              Маршрут · {pluralPoints(selected.checkpoints.length)}
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

      {showCreateForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)', padding: 24,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 560, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Новый груз</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Создание отправления</div>
              </div>
              <button type="button" onClick={closeCreateForm} disabled={submitting} style={{
                background: '#F1F5F9', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                width: 28, height: 28, borderRadius: 7, color: '#64748B', fontSize: 16, fontWeight: 700,
              }}>×</button>
            </div>

            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formErrors.length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
                  {formErrors.map((error) => <div key={error}>{error}</div>)}
                </div>
              )}

              <label>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Клиент *</div>
                <select
                  value={createForm.clientId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, clientId: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                >
                  <option value="">Выберите клиента</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </label>

              <label>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Менеджер</div>
                <select
                  value={createForm.managerId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, managerId: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                >
                  <option value="">Не назначен</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>

              <label>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Тип перевозки *</div>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value as TransportType }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                >
                  {transportTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Откуда *</div>
                  <input
                    value={createForm.origin}
                    onChange={(e) => setCreateForm((f) => ({ ...f, origin: e.target.value }))}
                    placeholder="Алматы"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                  />
                </label>
                <label>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Куда *</div>
                  <input
                    value={createForm.destination}
                    onChange={(e) => setCreateForm((f) => ({ ...f, destination: e.target.value }))}
                    placeholder="Ташкент"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                  />
                </label>
              </div>

              <label>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Груз</div>
                <input
                  value={createForm.cargo}
                  onChange={(e) => setCreateForm((f) => ({ ...f, cargo: e.target.value }))}
                  placeholder="Описание груза"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Вес</div>
                  <input
                    value={createForm.weight}
                    onChange={(e) => setCreateForm((f) => ({ ...f, weight: e.target.value }))}
                    placeholder="2 400 кг"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                  />
                </label>
                <label>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Объём</div>
                  <input
                    value={createForm.volume}
                    onChange={(e) => setCreateForm((f) => ({ ...f, volume: e.target.value }))}
                    placeholder="18 м³"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                  />
                </label>
              </div>

              <label>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Плановая дата доставки</div>
                <input
                  type="date"
                  value={createForm.estimatedDelivery}
                  onChange={(e) => setCreateForm((f) => ({ ...f, estimatedDelivery: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={createForm.telegramNotifications}
                  onChange={(e) => setCreateForm((f) => ({ ...f, telegramNotifications: e.target.checked }))}
                />
                <span style={{ fontSize: 12, color: '#64748B' }}>Telegram-уведомления</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={closeCreateForm} disabled={submitting} style={{
                  padding: '9px 18px', background: '#fff', color: '#64748B', border: '1px solid #E2E8F0',
                  borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer',
                }}>
                  Отмена
                </button>
                <button type="button" onClick={handleCreateSubmit} disabled={submitting} style={{
                  padding: '9px 20px', background: submitting ? '#94A3B8' : '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {submitting && (
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    }} />
                  )}
                  {submitting ? 'Сохранение...' : 'Создать груз'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import '../styles/shipments.css';
import { LocationAutocomplete } from '../components/LocationAutocomplete';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { QuantityWithUnitField } from '../components/QuantityWithUnitField';
import type { Client, Manager, Shipment, ShipmentStatus, TransportType } from '../data/mock';
import { normalizeLocationValue } from '../data/locations';
import {
  buildVolumePayload,
  buildWeightPayload,
  DEFAULT_VOLUME_UNIT,
  DEFAULT_WEIGHT_UNIT,
  formatShipmentVolumeDisplay,
  formatShipmentWeightDisplay,
  parseShipmentVolumeForForm,
  parseShipmentWeightForForm,
  validateVolumeField,
  validateWeightField,
  VOLUME_UNITS,
  WEIGHT_UNITS,
} from '../utils/shipmentUnits';
import { ApiError, createShipment, deleteShipment, exportShipmentsCsv, getClients, getManagers, getShipments, handleApiLoadFailure, updateShipment, updateShipmentStatus } from '../api';
import ApiLoadErrorPanel from '../components/ApiLoadErrorPanel';
import FormErrorList from '../components/FormErrorList';
import PageLoading from '../components/PageLoading';
import { formatFieldErrors, showApiMutationError } from '../utils/apiErrors';
import { validateShipmentFormFields } from '../utils/formValidation';
import {
  DEFAULT_SHIPMENT_CURRENCY,
  formatMoneyWithCurrency,
  formatPriceInputDisplay,
  parsePriceAmountForPayload,
  priceAmountToFormValue,
  SHIPMENT_CURRENCIES,
  validatePriceAmountField,
} from '../utils/shipmentPrice';
import { pluralPoints, shipmentStatusBg, shipmentStatusColors, shipmentStatusLabels } from '../utils/shipmentLabels';
import { useToast } from '../components/ToastProvider';
import { usePermissions } from '../hooks/usePermissions';
import type { CreateShipmentPayload, UpdateShipmentPayload } from '../types/api';

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
  weightUnit: string;
  volume: string;
  volumeUnit: string;
  estimatedDelivery: string;
  telegramNotifications: boolean;
  priceAmount: string;
  currency: string;
}

const emptyCreateForm: CreateFormState = {
  clientId: '',
  managerId: '',
  type: 'auto',
  origin: '',
  destination: '',
  cargo: '',
  weight: '',
  weightUnit: DEFAULT_WEIGHT_UNIT,
  volume: '',
  volumeUnit: DEFAULT_VOLUME_UNIT,
  estimatedDelivery: '',
  telegramNotifications: false,
  priceAmount: '',
  currency: DEFAULT_SHIPMENT_CURRENCY,
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
  priceAmount: string;
  currency: string;
}

function shipmentToEditForm(shipment: Shipment): EditFormState {
  const weight = parseShipmentWeightForForm(shipment.weight, shipment.weightUnit);
  const volume = parseShipmentVolumeForForm(shipment.volume, shipment.volumeUnit);

  return {
    clientId: shipment.clientId,
    managerId: shipment.managerId ?? '',
    type: shipment.type,
    origin: shipment.origin,
    destination: shipment.destination,
    cargo: shipment.cargo ?? '',
    weight: weight.displayValue,
    weightUnit: weight.unit,
    volume: volume.displayValue,
    volumeUnit: volume.unit,
    plannedPickup: shipment.plannedPickup ?? '',
    estimatedDelivery: shipment.estimatedDelivery ?? '',
    notes: shipment.notes ?? '',
    telegramNotifications: shipment.telegramNotifications,
    priceAmount: priceAmountToFormValue(shipment.priceAmount),
    currency: shipment.currency ?? DEFAULT_SHIPMENT_CURRENCY,
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
  weightUnit: 'Ед. веса',
  volume: 'Объём',
  volumeUnit: 'Ед. объёма',
  estimatedDelivery: 'Плановая дата',
  status: 'Статус',
  note: 'Комментарий',
  priceAmount: 'Стоимость перевозки',
  currency: 'Валюта',
};

export default function Shipments() {
  const { can } = usePermissions();
  const canCreate = can('shipment.create');
  const canReadManagers = can('manager.read');
  const canReadClients = can('client.read');
  const canUpdateStatus = can('shipment.updateStatus');
  const canDelete = can('shipment.delete');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState<ShipmentStatus>('planned');
  const [statusNote, setStatusNote] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
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

  const refreshManagers = async () => {
    const { managers: data } = await getManagers();
    setManagers(data);
  };

  useEffect(() => {
    Promise.all([getShipments(), getManagers(), getClients()])
      .then(([shipmentsRes, managersRes, clientsRes]) => {
        setShipments(shipmentsRes.shipments);
        setManagers(managersRes.managers);
        setClients(clientsRes.clients);
        setLoadError(null);
      })
      .catch((error) => {
        setLoadError(handleApiLoadFailure(error).message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) {
      setStatusDraft(selected.status);
      setStatusNote('');
      setStatusUpdateErrors([]);
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

    try {
      const { shipment } = await updateShipmentStatus(selected.id, {
        status,
        note: note?.trim() || undefined,
      });
      mergeShipment(shipment);
      setStatusDraft(shipment.status);
      setStatusNote('');
      showToast(`Статус ${shipment.trackingNumber} обновлён: ${shipmentStatusLabels[shipment.status]}`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setStatusUpdateErrors(formatFieldErrors(error.validationErrors, fieldLabels));
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

    const fieldErrors = validateShipmentFormFields({
      clientId: editForm.clientId,
      origin: editForm.origin,
      destination: editForm.destination,
    });
    if (fieldErrors.length > 0) {
      setEditErrors(fieldErrors);
      setEditSubmitting(false);
      return;
    }

    const weightError = validateWeightField(editForm.weight, editForm.weightUnit);
    const volumeError = validateVolumeField(editForm.volume, editForm.volumeUnit);
    const priceError = validatePriceAmountField(editForm.priceAmount, false);
    if (weightError || volumeError || priceError) {
      setEditErrors([weightError, volumeError, priceError].filter((msg): msg is string => Boolean(msg)));
      setEditSubmitting(false);
      return;
    }

    const parsedPrice = parsePriceAmountForPayload(editForm.priceAmount);

    const payload: UpdateShipmentPayload = {
      clientId: Number(editForm.clientId),
      managerId: editForm.managerId ? Number(editForm.managerId) : null,
      type: editForm.type,
      origin: normalizeLocationValue(editForm.origin),
      destination: normalizeLocationValue(editForm.destination),
      cargo: editForm.cargo.trim() || undefined,
      ...buildWeightPayload(editForm.weight, editForm.weightUnit),
      ...buildVolumePayload(editForm.volume, editForm.volumeUnit),
      plannedPickup: editForm.plannedPickup || undefined,
      estimatedDelivery: editForm.estimatedDelivery || undefined,
      notes: editForm.notes.trim() || undefined,
      telegramNotifications: editForm.telegramNotifications,
      priceAmount: parsedPrice ?? 0,
      currency: editForm.currency,
    };

    try {
      const { shipment } = await updateShipment(selected.id, payload);
      mergeShipment(shipment);
      setEditMode(false);
      setEditForm(shipmentToEditForm(shipment));
      showToast(`Груз ${shipment.trackingNumber} обновлён`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setEditErrors(formatFieldErrors(error.validationErrors, fieldLabels));
      } else if (error instanceof ApiError) {
        setEditErrors([error.message]);
      } else {
        setEditErrors(['Не удалось обновить груз. Проверьте подключение к API.']);
      }
      showApiMutationError(showToast, error, 'Не удалось обновить груз. Проверьте подключение к API.', {
        fieldLabels,
      });
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

    try {
      await deleteShipment(deletedId);
      const remaining = shipments.filter((item) => item.id !== deletedId);
      setShipments(remaining);
      setSelected(null);
      setEditMode(false);
      setShowDeleteConfirm(false);
      showToast(`Груз ${deletedTracking} удалён`);
    } catch (error) {
      if (error instanceof ApiError) {
        setDeleteErrors([error.message]);
      } else {
        setDeleteErrors(['Не удалось удалить груз. Проверьте подключение к API.']);
      }
      showApiMutationError(showToast, error, 'Не удалось удалить груз. Проверьте подключение к API.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await exportShipmentsCsv();
    } catch (error) {
      showApiMutationError(showToast, error, 'Не удалось экспортировать грузы. Проверьте подключение к API.');
    } finally {
      setExporting(false);
    }
  };

  const openCreateForm = () => {
    setCreateForm(emptyCreateForm);
    setFormErrors([]);
    void Promise.all([
      ...(canReadClients ? [refreshClients()] : []),
      ...(canReadManagers ? [refreshManagers()] : []),
    ]);
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

    const fieldErrors = validateShipmentFormFields({
      clientId: createForm.clientId,
      origin: createForm.origin,
      destination: createForm.destination,
    });
    if (fieldErrors.length > 0) {
      setFormErrors(fieldErrors);
      setSubmitting(false);
      return;
    }

    const weightError = validateWeightField(createForm.weight, createForm.weightUnit);
    const volumeError = validateVolumeField(createForm.volume, createForm.volumeUnit);
    const priceError = validatePriceAmountField(createForm.priceAmount, false);
    if (weightError || volumeError || priceError) {
      setFormErrors([weightError, volumeError, priceError].filter((msg): msg is string => Boolean(msg)));
      setSubmitting(false);
      return;
    }

    const parsedPrice = parsePriceAmountForPayload(createForm.priceAmount);

    const payload: CreateShipmentPayload = {
      clientId: Number(createForm.clientId),
      managerId: createForm.managerId ? Number(createForm.managerId) : undefined,
      type: createForm.type,
      origin: normalizeLocationValue(createForm.origin),
      destination: normalizeLocationValue(createForm.destination),
      cargo: createForm.cargo.trim() || undefined,
      ...buildWeightPayload(createForm.weight, createForm.weightUnit),
      ...buildVolumePayload(createForm.volume, createForm.volumeUnit),
      estimatedDelivery: createForm.estimatedDelivery || undefined,
      telegramNotifications: createForm.telegramNotifications,
      priceAmount: parsedPrice ?? 0,
      currency: createForm.currency,
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
      showToast(`Груз ${shipment.trackingNumber} успешно создан`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors, fieldLabels));
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось создать груз. Проверьте подключение к API.']);
      }
      showApiMutationError(showToast, error, 'Не удалось создать груз. Проверьте подключение к API.', {
        fieldLabels,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = shipments.filter(s =>
    (filter === 'all' || s.status === filter) &&
    (typeFilter === 'all' || s.type === typeFilter)
  );

  const isCompact = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    if (!isCompact || !selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCompact, selected]);

  useEffect(() => {
    if (!showCreateForm) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreateForm]);

  if (loadError && !loading) {
    return <ApiLoadErrorPanel message={loadError} />;
  }

  if (loading) {
    return <PageLoading className="shipments-page" />;
  }

  const renderDetailPanel = () => {
    if (!selected) return null;

    return (
      <>
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
                width: 36, height: 36, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', fontSize: 16, fontWeight: 700,
              }}>×</button>
            </div>

            {(canUpdateStatus || canDelete) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {canUpdateStatus && (
              <button
                type="button"
                onClick={openEditForm}
                disabled={editSubmitting || deleteSubmitting || showDeleteConfirm}
                style={{
                  flex: '1 1 120px', padding: '10px 12px', borderRadius: 8, border: '1px solid #BFDBFE',
                  background: editMode ? '#DBEAFE' : '#F0F7FF', color: '#1D4ED8',
                  fontSize: 12, fontWeight: 700, cursor: editSubmitting || deleteSubmitting ? 'not-allowed' : 'pointer',
                  minHeight: 40,
                }}
              >
                Редактировать
              </button>
              )}
              {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setEditMode(false);
                  setDeleteErrors([]);
                }}
                disabled={editSubmitting || deleteSubmitting}
                style={{
                  flex: '1 1 120px', padding: '10px 12px', borderRadius: 8, border: '1px solid #FECACA',
                  background: '#FEF2F2', color: '#B91C1C',
                  fontSize: 12, fontWeight: 700, cursor: editSubmitting || deleteSubmitting ? 'not-allowed' : 'pointer',
                  minHeight: 40,
                }}
              >
                Удалить
              </button>
              )}
            </div>
            )}

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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!deleteSubmitting) setShowDeleteConfirm(false);
                    }}
                    disabled={deleteSubmitting}
                    style={{
                      flex: '1 1 120px', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                      background: '#fff', color: '#64748B', fontSize: 12, fontWeight: 600,
                      cursor: deleteSubmitting ? 'not-allowed' : 'pointer', minHeight: 40,
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteConfirm()}
                    disabled={deleteSubmitting}
                    style={{
                      flex: '1 1 120px', padding: '10px 12px', borderRadius: 8, border: 'none',
                      background: deleteSubmitting ? '#94A3B8' : '#DC2626', color: '#fff',
                      fontSize: 12, fontWeight: 700, cursor: deleteSubmitting ? 'not-allowed' : 'pointer', minHeight: 40,
                    }}
                  >
                    {deleteSubmitting ? 'Удаление...' : 'Да, удалить'}
                  </button>
                </div>
              </div>
            )}

            {editMode && editForm ? (
              <div className="shipments-edit-form">
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Редактирование груза</div>

                <FormErrorList errors={editErrors} fontSize={11} padding="8px 10px" marginBottom={10} />

                <div className="shipments-edit-form-fields">
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

                  <div className="shipments-form-grid-2">
                    <LocationAutocomplete
                      label="Откуда *"
                      value={editForm.origin}
                      onChange={(origin) => setEditForm((f) => f && ({ ...f, origin }))}
                      disabled={editSubmitting}
                    />
                    <LocationAutocomplete
                      label="Куда *"
                      value={editForm.destination}
                      onChange={(destination) => setEditForm((f) => f && ({ ...f, destination }))}
                      disabled={editSubmitting}
                    />
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

                  <QuantityWithUnitField
                    quantityLabel="Вес"
                    unitLabel="Ед. веса"
                    value={editForm.weight}
                    unit={editForm.weightUnit}
                    units={WEIGHT_UNITS.map((u) => ({ value: u, label: u }))}
                    onValueChange={(weight) => setEditForm((f) => f && ({ ...f, weight }))}
                    onUnitChange={(weightUnit) => setEditForm((f) => f && ({ ...f, weightUnit }))}
                    disabled={editSubmitting}
                    placeholder="2 400"
                  />

                  <QuantityWithUnitField
                    quantityLabel="Объём"
                    unitLabel="Ед. объёма"
                    value={editForm.volume}
                    unit={editForm.volumeUnit}
                    units={VOLUME_UNITS.map((u) => ({ value: u, label: u === 'm3' ? 'm³' : u }))}
                    onValueChange={(volume) => setEditForm((f) => f && ({ ...f, volume }))}
                    onUnitChange={(volumeUnit) => setEditForm((f) => f && ({ ...f, volumeUnit }))}
                    disabled={editSubmitting}
                    placeholder="18"
                  />

                  <div className="shipments-form-grid-2">
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

                  <label>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Стоимость перевозки</div>
                    <input
                      inputMode="decimal"
                      value={editForm.priceAmount}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, priceAmount: formatPriceInputDisplay(e.target.value) }))}
                      disabled={editSubmitting}
                      placeholder="12 500"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Валюта</div>
                    <select
                      value={editForm.currency}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, currency: e.target.value }))}
                      disabled={editSubmitting}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, background: '#fff', outline: 'none' }}
                    >
                      {SHIPMENT_CURRENCIES.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="shipments-form-actions" style={{ marginTop: 12 }}>
                  <button type="button" onClick={closeEditForm} disabled={editSubmitting} style={{
                    flex: '1 1 120px', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                    background: '#fff', color: '#64748B', fontSize: 12, fontWeight: 600,
                    cursor: editSubmitting ? 'not-allowed' : 'pointer', minHeight: 44,
                  }}>
                    Отмена
                  </button>
                  <button type="button" onClick={() => void handleEditSubmit()} disabled={editSubmitting} style={{
                    flex: '1 1 120px', padding: '10px 12px', borderRadius: 8, border: 'none',
                    background: editSubmitting ? '#94A3B8' : '#3B82F6', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: editSubmitting ? 'not-allowed' : 'pointer', minHeight: 44,
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
                {
                  icon: '⚖',
                  label: 'Вес / Объём',
                  value: [formatShipmentWeightDisplay(selected.weight, selected.weightUnit), formatShipmentVolumeDisplay(selected.volume, selected.volumeUnit)]
                    .filter(Boolean)
                    .join(' · ') || undefined,
                },
                { icon: '📅', label: 'Плановая дата', value: selected.estimatedDelivery },
                {
                  icon: '💰',
                  label: 'Стоимость перевозки',
                  value: formatMoneyWithCurrency(selected.priceAmount ?? 0, selected.currency ?? 'USD'),
                },
              ].filter(({ value }) => value).map(({ icon, label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, background: '#F8FAFC',
                }}>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
            </div>
            )}

            {canUpdateStatus && (
            <div style={{ marginBottom: 18, padding: '14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Обновить статус</div>

              <FormErrorList errors={statusUpdateErrors} fontSize={11} padding="8px 10px" marginBottom={10} />

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
                  width: '100%', padding: '11px 14px', background: statusUpdating ? '#94A3B8' : '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12,
                  cursor: statusUpdating ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40,
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
            )}

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
                  <div style={{ flex: 1, paddingBottom: 14, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
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
                      <div style={{ fontSize: 10, color: cp.arrivedAt ? '#10B981' : '#94A3B8', textAlign: 'right', flexShrink: 0 }}>
                        {cp.arrivedAt ? `✓ ${cp.arrivedAt}` : cp.plannedAt}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      </>
    );
  };

  return (
    <div className="shipments-page">

      <div className="shipments-toolbar">
        <div className="shipments-filter-group">
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

        <div className="shipments-filter-group">
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

        <div className="shipments-toolbar-actions">
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={exporting}
            style={{
              padding: '9px 16px', background: '#fff', color: '#334155',
              border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? 'Экспорт...' : 'Экспорт грузов'}
          </button>
          {canCreate && (
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
          )}
        </div>
      </div>

      <div className="shipments-layout">
        <div className="shipments-list">
          {filtered.map(s => {
            const client = clients.find(c => c.id === s.clientId);
            const manager = managers.find(m => m.id === s.managerId);
            const isSelected = selected?.id === s.id;
            const stepIdx = s.status === 'delayed' ? 1 : Math.max(0, stepKeys.indexOf(s.status));

            return (
              <div
                key={s.id}
                onClick={() => setSelected(isSelected ? null : s)}
                className="shipments-card"
                style={{
                  border: `1.5px solid ${isSelected ? '#3B82F6' : '#EEF2FF'}`,
                  boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                }}
              >
                <div className="shipments-card-top">
                  <div style={{ flexShrink: 0 }}>
                    <TypeIcon type={s.type} />
                  </div>

                  <div className="shipments-card-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: -0.3 }}>
                        {s.trackingNumber}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: shipmentStatusBg[s.status], color: shipmentStatusColors[s.status],
                      }}>{shipmentStatusLabels[s.status]}</span>
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

                  <div className="shipments-card-meta">
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{client?.company}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      <span style={{ fontWeight: 500 }}>Менеджер:</span> {manager?.name.split(' ').slice(0, 2).join(' ')}
                    </div>
                    {(s.weight || s.volume) && (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        {[formatShipmentWeightDisplay(s.weight, s.weightUnit), formatShipmentVolumeDisplay(s.volume, s.volumeUnit)]
                          .filter(Boolean)
                          .join(' · ')}
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

        {selected && !isCompact && (
          <div className="shipments-detail">
            {renderDetailPanel()}
          </div>
        )}
      </div>

      {selected && isCompact && (
        <>
          <button
            type="button"
            className="shipments-detail-backdrop"
            aria-label="Закрыть детали груза"
            onClick={() => setSelected(null)}
          />
          <div className="shipments-detail shipments-detail--drawer">
            {renderDetailPanel()}
          </div>
        </>
      )}

      {showCreateForm && (
        <div className="shipments-form-overlay" role="dialog" aria-modal="true" aria-labelledby="create-shipment-title">
          <div className="shipments-create-modal">
            <div className="shipments-form-header">
              <div>
                <div id="create-shipment-title" style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Новый груз</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Создание отправления</div>
              </div>
              <button type="button" onClick={closeCreateForm} disabled={submitting} aria-label="Закрыть" style={{
                background: '#F1F5F9', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                width: 36, height: 36, borderRadius: 7, color: '#64748B', fontSize: 16, fontWeight: 700,
                flexShrink: 0,
              }}>×</button>
            </div>

            <div className="shipments-form-body">
              <div className="shipments-form-fields">
              <FormErrorList errors={formErrors} marginBottom={0} />

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

              <div className="shipments-create-form-grid">
                <LocationAutocomplete
                  label="Откуда *"
                  value={createForm.origin}
                  onChange={(origin) => setCreateForm((f) => ({ ...f, origin }))}
                  placeholder="Almaty"
                  inputStyle={{ padding: '9px 12px', fontSize: 13, background: '#F8FAFC' }}
                />
                <LocationAutocomplete
                  label="Куда *"
                  value={createForm.destination}
                  onChange={(destination) => setCreateForm((f) => ({ ...f, destination }))}
                  placeholder="Tashkent"
                  inputStyle={{ padding: '9px 12px', fontSize: 13, background: '#F8FAFC' }}
                />
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

              <QuantityWithUnitField
                quantityLabel="Вес"
                unitLabel="Ед. веса"
                value={createForm.weight}
                unit={createForm.weightUnit}
                units={WEIGHT_UNITS.map((u) => ({ value: u, label: u }))}
                onValueChange={(weight) => setCreateForm((f) => ({ ...f, weight }))}
                onUnitChange={(weightUnit) => setCreateForm((f) => ({ ...f, weightUnit }))}
                placeholder="2 400"
                quantityStyle={{ padding: '9px 12px', fontSize: 13, background: '#F8FAFC' }}
                unitStyle={{ padding: '9px 12px', fontSize: 13, background: '#F8FAFC' }}
              />

              <QuantityWithUnitField
                quantityLabel="Объём"
                unitLabel="Ед. объёма"
                value={createForm.volume}
                unit={createForm.volumeUnit}
                units={VOLUME_UNITS.map((u) => ({ value: u, label: u === 'm3' ? 'm³' : u }))}
                onValueChange={(volume) => setCreateForm((f) => ({ ...f, volume }))}
                onUnitChange={(volumeUnit) => setCreateForm((f) => ({ ...f, volumeUnit }))}
                placeholder="18"
                quantityStyle={{ padding: '9px 12px', fontSize: 13, background: '#F8FAFC' }}
                unitStyle={{ padding: '9px 12px', fontSize: 13, background: '#F8FAFC' }}
              />

              <div className="shipments-create-form-grid">
                <label>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Стоимость перевозки</div>
                  <input
                    inputMode="decimal"
                    value={createForm.priceAmount}
                    onChange={(e) => setCreateForm((f) => ({ ...f, priceAmount: formatPriceInputDisplay(e.target.value) }))}
                    placeholder="12 500"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                  />
                </label>
                <label>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Валюта</div>
                  <select
                    value={createForm.currency}
                    onChange={(e) => setCreateForm((f) => ({ ...f, currency: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                  >
                    {SHIPMENT_CURRENCIES.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
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

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minHeight: 44 }}>
                <input
                  type="checkbox"
                  checked={createForm.telegramNotifications}
                  onChange={(e) => setCreateForm((f) => ({ ...f, telegramNotifications: e.target.checked }))}
                />
                <span style={{ fontSize: 12, color: '#64748B' }}>Telegram-уведомления</span>
              </label>
              </div>

              <div className="shipments-form-actions">
                <button type="button" onClick={closeCreateForm} disabled={submitting} style={{
                  flex: '1 1 120px', padding: '10px 18px', background: '#fff', color: '#64748B', border: '1px solid #E2E8F0',
                  borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer', minHeight: 44,
                }}>
                  Отмена
                </button>
                <button type="button" onClick={handleCreateSubmit} disabled={submitting} style={{
                  flex: '1 1 160px', padding: '10px 20px', background: submitting ? '#94A3B8' : '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44,
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

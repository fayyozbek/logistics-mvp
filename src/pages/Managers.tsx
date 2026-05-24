import { useEffect, useState } from 'react';
import type { Client, Manager, Shipment } from '../data/mock';
import {
  ApiError,
  createManager,
  deleteManager,
  formatValidationErrors,
  getActionErrorMessage,
  getApiErrorMessage,
  getManagers,
  updateManager,
} from '../api';
import type { CreateManagerPayload } from '../types/api';
import ApiLoadErrorBanner from '../components/ApiLoadErrorBanner';
import { usePermissions } from '../hooks/usePermissions';

const statusColors: Record<string, string> = {
  planned: '#F59E0B', in_transit: '#3B82F6', at_checkpoint: '#8B5CF6', delivered: '#10B981', delayed: '#EF4444',
};
const statusLabel: Record<string, string> = {
  planned: 'Запланирован', in_transit: 'В пути', at_checkpoint: 'На пункте', delivered: 'Доставлен', delayed: 'Задержка',
};

interface ManagerFormState {
  name: string;
  email: string;
  phone: string;
  telegramId: string;
  region: string;
  avatar: string;
}

const emptyForm: ManagerFormState = {
  name: '',
  email: '',
  phone: '',
  telegramId: '',
  region: '',
  avatar: '',
};

export default function Managers() {
  const { can } = usePermissions();
  const canCreate = can('manager.create');
  const canUpdate = can('manager.update');
  const canDelete = can('manager.delete');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Manager | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ManagerFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [actionError, setActionError] = useState('');

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

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors([]);
    setActionError('');
    setShowForm(true);
  };

  const openEditForm = (manager: Manager) => {
    setEditingId(manager.id);
    setForm({
      name: manager.name,
      email: manager.email ?? '',
      phone: manager.phone ?? '',
      telegramId: manager.telegramId ?? '',
      region: manager.region ?? '',
      avatar: manager.avatar ?? '',
    });
    setFormErrors([]);
    setActionError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setShowForm(false);
    setFormErrors([]);
  };

  const buildPayload = (): CreateManagerPayload => ({
    name: form.name.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    telegramId: form.telegramId.trim() || undefined,
    region: form.region.trim() || undefined,
    avatar: form.avatar.trim() || undefined,
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormErrors([]);
    setActionError('');
    setSuccessMessage('');

    try {
      if (editingId) {
        const { manager } = await updateManager(editingId, buildPayload());
        setManagers((current) => current.map((item) => (item.id === manager.id ? manager : item)));
        if (selected?.id === manager.id) {
          setSelected(manager);
        }
        setSuccessMessage(`Менеджер «${manager.name}» обновлён`);
      } else {
        const { manager } = await createManager(buildPayload());
        setManagers((current) => [...current, manager]);
        setSuccessMessage(`Менеджер «${manager.name}» создан`);
      }
      setShowForm(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatValidationErrors(error.validationErrors));
      } else {
        setFormErrors([getActionErrorMessage(error, 'Не удалось сохранить менеджера.')]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (manager: Manager) => {
    if (!window.confirm(`Удалить менеджера «${manager.name}»?`)) {
      return;
    }

    setDeleting(true);
    setActionError('');
    setSuccessMessage('');

    try {
      await deleteManager(manager.id);
      setManagers((current) => current.filter((item) => item.id !== manager.id));
      if (selected?.id === manager.id) {
        setSelected(null);
      }
      setSuccessMessage(`Менеджер «${manager.name}» удалён`);
    } catch (error) {
      setActionError(getActionErrorMessage(error, 'Не удалось удалить менеджера.'));
    } finally {
      setDeleting(false);
    }
  };

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
    <div style={{ padding: '20px clamp(14px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(successMessage || actionError) && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 10,
          background: actionError ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${actionError ? '#FECACA' : '#BBF7D0'}`,
          color: actionError ? '#B91C1C' : '#166534',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {actionError || successMessage}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          Всего менеджеров: <strong>{managers.length}</strong>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openCreateForm}
            style={{ padding: '8px 18px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            + Добавить менеджера
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
        {managers.map((m) => {
          const managerShipments = shipments.filter((s) => s.managerId === m.id);
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{m.region || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[['📧', m.email], ['📞', m.phone], ['✈', m.telegramId]].map(([icon, val]) => (
                  <div key={String(val)} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <span style={{ fontSize: 11 }}>{icon}</span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>{val || '—'}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Активных грузов</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{m.activeShipments}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Всего</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{managerShipments.length}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Грузы менеджера: {selected.name}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canUpdate && (
                <button
                  type="button"
                  onClick={() => openEditForm(selected)}
                  style={{ padding: '6px 14px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Редактировать
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete(selected)}
                  disabled={deleting}
                  style={{ padding: '6px 14px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}
                >
                  {deleting ? 'Удаление…' : 'Удалить'}
                </button>
              )}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                {['Трекинг', 'Тип', 'Клиент', 'Откуда', 'Куда', 'Статус', 'ETA'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#94A3B8', fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.filter((s) => s.managerId === selected.id).map((s) => {
                const client = clients.find((c) => c.id === s.clientId) ?? s.client;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0F172A' }}>{s.trackingNumber}</td>
                    <td style={{ padding: '9px 10px' }}>{s.type === 'auto' ? '🚛' : s.type === 'air' ? '✈' : s.type === 'sea' ? '🚢' : '🔀'}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{client?.company ?? '—'}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{s.origin}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{s.destination}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${statusColors[s.status]}18`, color: statusColors[s.status] }}>
                        {statusLabel[s.status]}
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

      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)', padding: 24,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 520, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{editingId ? 'Редактировать менеджера' : 'Новый менеджер'}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Контакты и регион ответственности</div>
              </div>
              <button type="button" onClick={closeForm} disabled={submitting} style={{
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

              {[
                { key: 'name', label: 'ФИО *', required: true },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'Телефон' },
                { key: 'telegramId', label: 'Telegram' },
                { key: 'region', label: 'Регион' },
                { key: 'avatar', label: 'Инициалы (необяз.)' },
              ].map((field) => (
                <label key={field.key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>{field.label}</div>
                  <input
                    type={field.type ?? 'text'}
                    required={field.required}
                    value={form[field.key as keyof ManagerFormState]}
                    onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))}
                    disabled={submitting}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
                  />
                </label>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={closeForm} disabled={submitting} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Отмена
                </button>
                <button type="button" onClick={() => void handleSubmit()} disabled={submitting} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: submitting ? '#93C5FD' : '#3B82F6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Сохранение…' : editingId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { type Manager, type Shipment } from '../data/mock';
import { ApiError, createManager, deleteManager, getManagers, handleApiLoadFailure, updateManager } from '../api';
import ApiLoadErrorPanel from '../components/ApiLoadErrorPanel';
import FormErrorList from '../components/FormErrorList';
import InlineConfirm from '../components/InlineConfirm';
import PageLoading from '../components/PageLoading';
import { useToast } from '../components/ToastProvider';
import { usePermissions } from '../hooks/usePermissions';
import { formatFieldErrors, showApiMutationError } from '../utils/apiErrors';
import { hasRequiredStrings } from '../utils/formValidation';
import { shipmentStatusColors, shipmentStatusLabels } from '../utils/shipmentLabels';
import { shipmentClientCompany } from '../utils/trackingLabels';
import type { CreateManagerPayload, UpdateManagerPayload } from '../types/api';

interface ManagerFormState {
  name: string;
  email: string;
  phone: string;
  telegramId: string;
  region: string;
  role: string;
  department: string;
}

const emptyForm: ManagerFormState = {
  name: '',
  email: '',
  phone: '',
  telegramId: '',
  region: '',
  role: '',
  department: '',
};

const fieldLabels: Record<string, string> = {
  name: 'Имя',
  email: 'Email',
  phone: 'Телефон',
  telegramId: 'Telegram',
  region: 'Регион',
  role: 'Роль',
  department: 'Отдел',
  manager: 'Менеджер',
};

const mapManagerFieldError = (field: string, message: string): string | undefined => {
  if (field === 'manager' && message.includes('active shipments')) {
    return 'Нельзя удалить менеджера: есть активные грузы. Переназначьте или завершите грузы.';
  }
  return undefined;
};

function managerToForm(manager: Manager): ManagerFormState {
  return {
    name: manager.name,
    email: manager.email ?? '',
    phone: manager.phone ?? '',
    telegramId: manager.telegramId ?? '',
    region: manager.region ?? '',
    role: manager.role ?? '',
    department: manager.department ?? '',
  };
}

function formToCreatePayload(form: ManagerFormState): CreateManagerPayload {
  return {
    name: form.name.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    telegramId: form.telegramId.trim() || undefined,
    region: form.region.trim() || undefined,
    role: form.role.trim() || undefined,
    department: form.department.trim() || undefined,
  };
}

function formToUpdatePayload(form: ManagerFormState): UpdateManagerPayload {
  return formToCreatePayload(form);
}

export default function Managers() {
  const { can } = usePermissions();
  const canCreate = can('manager.create');
  const canUpdate = can('manager.update');
  const canDelete = can('manager.delete');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Manager | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ManagerFormState>(emptyForm);
  const [createForm, setCreateForm] = useState<ManagerFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadOverview = useCallback(async () => {
    const { managers: m, shipments: s } = await getManagers();
    setManagers(m);
    setShipments(s);
    return m;
  }, []);

  useEffect(() => {
    loadOverview()
      .then(() => setLoadError(null))
      .catch((error) => setLoadError(handleApiLoadFailure(error).message))
      .finally(() => setLoading(false));
  }, [loadOverview]);

  useEffect(() => {
    setEditMode(false);
    setShowDeleteConfirm(false);
    setFormErrors([]);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const fresh = managers.find((m) => m.id === selected.id) ?? selected;
    setSelected(fresh);
    setForm((current) => (editMode ? current : managerToForm(fresh)));
  }, [selected?.id, managers, editMode]);

  const openCreateForm = () => {
    setCreateForm(emptyForm);
    setFormErrors([]);
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

    try {
      const { manager } = await createManager(formToCreatePayload(createForm));
      await loadOverview();
      setSelected(manager);
      setShowCreateForm(false);
      setCreateForm(emptyForm);
      showToast(`Менеджер ${manager.name} добавлен`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors, fieldLabels, mapManagerFieldError));
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось создать менеджера. Проверьте подключение к API.']);
      }
      showApiMutationError(showToast, error, 'Не удалось создать менеджера. Проверьте подключение к API.', {
        fieldLabels,
        mapMessage: mapManagerFieldError,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selected) return;

    setSubmitting(true);
    setFormErrors([]);

    try {
      const { manager } = await updateManager(selected.id, formToUpdatePayload(form));
      await loadOverview();
      setSelected(manager);
      setEditMode(false);
      showToast(`Менеджер ${manager.name} обновлён`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors, fieldLabels, mapManagerFieldError));
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось обновить менеджера. Проверьте подключение к API.']);
      }
      showApiMutationError(showToast, error, 'Не удалось обновить менеджера. Проверьте подключение к API.', {
        fieldLabels,
        mapMessage: mapManagerFieldError,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selected) return;

    const deletedId = selected.id;
    const deletedName = selected.name;

    setDeleteSubmitting(true);
    setFormErrors([]);

    try {
      await deleteManager(deletedId);
      await loadOverview();
      setSelected(null);
      setEditMode(false);
      setShowDeleteConfirm(false);
      showToast(`Менеджер ${deletedName} удалён`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors, fieldLabels, mapManagerFieldError));
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось удалить менеджера. Проверьте подключение к API.']);
      }
      showApiMutationError(showToast, error, 'Не удалось удалить менеджера. Проверьте подключение к API.', {
        fieldLabels,
        mapMessage: mapManagerFieldError,
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const renderFormFields = (
    value: ManagerFormState,
    onChange: (next: ManagerFormState) => void,
    disabled: boolean,
  ) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <label style={{ gridColumn: '1 / -1' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Имя *</div>
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Email</div>
        <input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Телефон</div>
        <input
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Telegram</div>
        <input
          value={value.telegramId}
          onChange={(e) => onChange({ ...value, telegramId: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Регион</div>
        <input
          value={value.region}
          onChange={(e) => onChange({ ...value, region: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Роль</div>
        <input
          value={value.role}
          onChange={(e) => onChange({ ...value, role: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Отдел</div>
        <input
          value={value.department}
          onChange={(e) => onChange({ ...value, department: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
    </div>
  );

  if (loadError && !loading) {
    return <ApiLoadErrorPanel message={loadError} />;
  }

  if (loading) {
    return <PageLoading padding="24px 28px" />;
  }

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          Всего менеджеров: <strong style={{ color: '#0F172A' }}>{managers.length}</strong>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {managers.map((m) => {
          const managerShipments = shipments.filter((s) => s.managerId === m.id);
          const isSelected = selected?.id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(isSelected ? null : m)}
              style={{
                textAlign: 'left',
                background: '#fff', borderRadius: 12, padding: '18px 20px',
                border: `1.5px solid ${isSelected ? '#3B82F6' : '#E2E8F0'}`,
                cursor: 'pointer', transition: 'border-color 0.15s',
                width: '100%',
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
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>
                    {[m.region, m.role, m.department].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  ['📧', m.email],
                  ['📞', m.phone],
                  ['✈', m.telegramId],
                ].filter(([, val]) => val).map(([icon, val]) => (
                  <div key={String(val)} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
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
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Всего грузов</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{managerShipments.length}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#F0FDF4', color: '#10B981', fontWeight: 600 }}>Активен</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>ID: {selected.id}</div>
            </div>
            {(canUpdate || canDelete) && (
            <div style={{ display: 'flex', gap: 8 }}>
              {canUpdate && (
              <button
                type="button"
                onClick={() => {
                  setForm(managerToForm(selected));
                  setEditMode(true);
                  setShowDeleteConfirm(false);
                  setFormErrors([]);
                }}
                disabled={submitting || deleteSubmitting}
                style={{
                  padding: '6px 14px', background: editMode ? '#DBEAFE' : '#F0F7FF', color: '#1D4ED8',
                  border: '1px solid #BFDBFE', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Редактировать
              </button>
              )}
              {canDelete && (
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(true); setEditMode(false); setFormErrors([]); }}
                disabled={submitting || deleteSubmitting}
                style={{
                  padding: '6px 14px', background: '#FEF2F2', color: '#B91C1C',
                  border: '1px solid #FECACA', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Удалить
              </button>
              )}
            </div>
            )}
          </div>

          <FormErrorList errors={formErrors} />

          {showDeleteConfirm ? (
            <InlineConfirm
              message={`Удалить менеджера ${selected.name}?`}
              confirming={deleteSubmitting}
              marginBottom={16}
              onCancel={() => !deleteSubmitting && setShowDeleteConfirm(false)}
              onConfirm={() => void handleDeleteConfirm()}
            />
          ) : editMode ? (
            <div style={{ marginBottom: 16, padding: '14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              {renderFormFields(form, setForm, submitting)}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={() => { setEditMode(false); setForm(managerToForm(selected)); setFormErrors([]); }} disabled={submitting} style={{
                  flex: 1, padding: '9px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600,
                }}>Отмена</button>
                <button type="button" onClick={() => void handleEditSubmit()} disabled={submitting || !hasRequiredStrings(form.name)} style={{
                  flex: 1, padding: '9px 14px', borderRadius: 8, border: 'none',
                  background: submitting ? '#94A3B8' : '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 700,
                }}>
                  {submitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Грузы менеджера</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                {['Трекинг', 'Тип', 'Клиент', 'Откуда', 'Куда', 'Статус', 'ETA'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#94A3B8', fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.filter((s) => s.managerId === selected.id).map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0F172A' }}>{s.trackingNumber}</td>
                    <td style={{ padding: '9px 10px' }}>{s.type === 'auto' ? '🚛' : s.type === 'air' ? '✈' : s.type === 'sea' ? '🚢' : '🔀'}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{shipmentClientCompany(s)}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{s.origin}</td>
                    <td style={{ padding: '9px 10px', color: '#64748B' }}>{s.destination}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: shipmentStatusColors[s.status] + '18', color: shipmentStatusColors[s.status] }}>
                        {shipmentStatusLabels[s.status]}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#94A3B8' }}>{s.estimatedDelivery}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)', padding: 24,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 520, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Новый менеджер</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Операционный профиль для назначения на грузы</div>
              </div>
              <button type="button" onClick={closeCreateForm} disabled={submitting} style={{
                background: '#F1F5F9', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                width: 28, height: 28, borderRadius: 7, color: '#64748B', fontSize: 16, fontWeight: 700,
              }}>×</button>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <FormErrorList errors={formErrors} />
              {renderFormFields(createForm, setCreateForm, submitting)}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" onClick={closeCreateForm} disabled={submitting} style={{
                  padding: '9px 18px', background: '#fff', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                }}>Отмена</button>
                <button type="button" onClick={() => void handleCreateSubmit()} disabled={submitting || !hasRequiredStrings(createForm.name)} style={{
                  padding: '9px 20px', background: submitting ? '#94A3B8' : '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer',
                }}>
                  {submitting ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

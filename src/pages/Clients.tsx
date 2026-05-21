import { useCallback, useEffect, useState } from 'react';
import type { Client } from '../data/mock';
import { ApiError, createClient, deleteClient, getClients, handleApiLoadFailure, updateClient } from '../api';
import ApiLoadErrorPanel from '../components/ApiLoadErrorPanel';
import FormErrorList from '../components/FormErrorList';
import InlineConfirm from '../components/InlineConfirm';
import PageLoading from '../components/PageLoading';
import { useToast } from '../components/ToastProvider';
import { formatFieldErrors, showApiMutationError } from '../utils/apiErrors';
import { hasRequiredStrings } from '../utils/formValidation';
import type { CreateClientPayload, UpdateClientPayload } from '../types/api';

interface ClientFormState {
  company: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
}

const emptyForm: ClientFormState = {
  company: '',
  name: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  address: '',
};

const fieldLabels: Record<string, string> = {
  company: 'Компания',
  name: 'Контактное лицо',
  contact: 'Контактное лицо',
  email: 'Email',
  phone: 'Телефон',
  country: 'Страна',
  city: 'Город',
  address: 'Адрес',
  client: 'Партнёр',
};

function clientToForm(client: Client): ClientFormState {
  return {
    company: client.company,
    name: client.contact,
    email: client.email ?? '',
    phone: client.phone ?? '',
    country: client.country ?? '',
    city: client.city ?? '',
    address: client.address ?? '',
  };
}

function formToCreatePayload(form: ClientFormState): CreateClientPayload {
  return {
    company: form.company.trim(),
    name: form.name.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    country: form.country.trim() || undefined,
    city: form.city.trim() || undefined,
    address: form.address.trim() || undefined,
  };
}

function formToUpdatePayload(form: ClientFormState): UpdateClientPayload {
  return {
    company: form.company.trim(),
    contact: form.name.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    country: form.country.trim() || undefined,
    city: form.city.trim() || undefined,
    address: form.address.trim() || undefined,
  };
}

export default function Clients() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [createForm, setCreateForm] = useState<ClientFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadClients = useCallback(async () => {
    const { clients: data } = await getClients();
    setClients(data);
    return data;
  }, []);

  useEffect(() => {
    loadClients()
      .then(() => setLoadError(null))
      .catch((error) => setLoadError(handleApiLoadFailure(error).message))
      .finally(() => setLoading(false));
  }, [loadClients]);

  useEffect(() => {
    if (selected) {
      setForm(clientToForm(selected));
      setEditMode(false);
      setShowDeleteConfirm(false);
      setFormErrors([]);
    }
  }, [selected?.id]);

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
      const { client } = await createClient(formToCreatePayload(createForm));
      await loadClients();
      setSelected(client);
      setShowCreateForm(false);
      setCreateForm(emptyForm);
      showToast(`Партнёр ${client.company} добавлен`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors, fieldLabels));
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось создать партнёра. Проверьте подключение к API.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selected) return;

    setSubmitting(true);
    setFormErrors([]);

    try {
      const { client } = await updateClient(selected.id, formToUpdatePayload(form));
      await loadClients();
      setSelected(client);
      setEditMode(false);
      showToast(`Партнёр ${client.company} обновлён`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors, fieldLabels));
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось обновить партнёра. Проверьте подключение к API.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selected) return;

    const deletedId = selected.id;
    const deletedCompany = selected.company;

    setDeleteSubmitting(true);
    setFormErrors([]);

    try {
      await deleteClient(deletedId);
      await loadClients();
      setSelected(null);
      setEditMode(false);
      setShowDeleteConfirm(false);
      showToast(`Партнёр ${deletedCompany} удалён`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        const messages = formatFieldErrors(error.validationErrors, fieldLabels);
        setFormErrors([
          messages[0]?.includes('shipments')
            ? 'Нельзя удалить партнёра: есть связанные грузы. Сначала удалите или переназначьте грузы.'
            : messages[0] ?? 'Нельзя удалить партнёра: запись используется в системе.',
        ]);
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось удалить партнёра. Проверьте подключение к API.']);
      }
      showApiMutationError(showToast, error, 'Не удалось удалить партнёра. Проверьте подключение к API.', {
        fieldLabels,
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loadError && !loading) {
    return <ApiLoadErrorPanel message={loadError} />;
  }

  if (loading) {
    return <PageLoading />;
  }

  const renderFormFields = (
    value: ClientFormState,
    onChange: (next: ClientFormState) => void,
    disabled: boolean,
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Компания *</div>
        <input
          value={value.company}
          onChange={(e) => onChange({ ...value, company: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Контактное лицо *</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Страна</div>
          <input
            value={value.country}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            disabled={disabled}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
          />
        </label>
        <label>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Город</div>
          <input
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            disabled={disabled}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
          />
        </label>
      </div>
      <label>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Адрес</div>
        <input
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#F8FAFC', outline: 'none' }}
        />
      </label>
    </div>
  );

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          Партнёры / клиенты: <strong style={{ color: '#0F172A' }}>{clients.length}</strong>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          style={{
            padding: '9px 20px', background: '#3B82F6', color: '#fff', border: 'none',
            borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Добавить партнёра
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clients.map((client) => {
            const isSelected = selected?.id === client.id;
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelected(isSelected ? null : client)}
                style={{
                  textAlign: 'left',
                  background: '#fff',
                  borderRadius: 14,
                  padding: '16px 20px',
                  border: `1.5px solid ${isSelected ? '#3B82F6' : '#EEF2FF'}`,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  width: '100%',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{client.company}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{client.contact}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                  {[client.email, client.phone, client.city, client.country].filter(Boolean).join(' · ')}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div style={{
            width: 360, background: '#fff', borderRadius: 14, padding: '22px',
            border: '1px solid #E2E8F0', position: 'sticky', top: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{selected.company}</div>
                {selected.contact && (
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{selected.contact}</div>
                )}
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{
                background: '#F1F5F9', border: 'none', cursor: 'pointer',
                width: 28, height: 28, borderRadius: 7, color: '#64748B', fontSize: 16, fontWeight: 700,
              }}>×</button>
            </div>

            <FormErrorList errors={formErrors} />

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => { setEditMode(true); setShowDeleteConfirm(false); setFormErrors([]); }}
                disabled={submitting || deleteSubmitting}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #BFDBFE',
                  background: editMode ? '#DBEAFE' : '#F0F7FF', color: '#1D4ED8',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Редактировать
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(true); setEditMode(false); setFormErrors([]); }}
                disabled={submitting || deleteSubmitting}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #FECACA',
                  background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Удалить
              </button>
            </div>

            {showDeleteConfirm ? (
              <InlineConfirm
                message={`Удалить ${selected.company}?`}
                confirming={deleteSubmitting}
                onCancel={() => !deleteSubmitting && setShowDeleteConfirm(false)}
                onConfirm={() => void handleDeleteConfirm()}
              />
            ) : editMode ? (
              <>
                {renderFormFields(form, setForm, submitting)}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button type="button" onClick={() => { setEditMode(false); setForm(clientToForm(selected)); setFormErrors([]); }} disabled={submitting} style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600,
                  }}>Отмена</button>
                  <button type="button" onClick={() => void handleEditSubmit()} disabled={submitting || !hasRequiredStrings(form.company, form.name)} style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, border: 'none',
                    background: submitting ? '#94A3B8' : '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 700,
                  }}>
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Контакт', value: selected.contact },
                  { label: 'Email', value: selected.email },
                  { label: 'Телефон', value: selected.phone },
                  { label: 'Страна', value: selected.country },
                  { label: 'Город', value: selected.city },
                  { label: 'Адрес', value: selected.address },
                ].filter((row) => row.value).map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, background: '#F8FAFC' }}>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', textAlign: 'right', maxWidth: 200 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)', padding: 24,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 480, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Новый партнёр</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Клиент для создания грузов</div>
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
                <button type="button" onClick={() => void handleCreateSubmit()} disabled={submitting || !hasRequiredStrings(createForm.company, createForm.name)} style={{
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

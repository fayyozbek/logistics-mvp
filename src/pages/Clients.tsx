import { useEffect, useState } from 'react';
import type { Client } from '../data/mock';
import {
  ApiError,
  createClient,
  deleteClient,
  formatValidationErrors,
  getActionErrorMessage,
  getApiErrorMessage,
  getClients,
  updateClient,
} from '../api';
import type { CreateClientPayload } from '../types/api';
import ApiLoadErrorBanner from '../components/ApiLoadErrorBanner';
import { usePermissions } from '../hooks/usePermissions';

interface ClientFormState {
  company: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
}

const emptyForm: ClientFormState = {
  company: '',
  contact: '',
  email: '',
  phone: '',
  country: '',
};

export default function Clients() {
  const { can } = usePermissions();
  const canCreate = can('client.create');
  const canUpdate = can('client.update');
  const canDelete = can('client.delete');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    getClients()
      .then(({ clients: loaded }) => setClients(loaded))
      .catch((error) => {
        setLoadError(getApiErrorMessage(error, 'Не удалось загрузить партнёров.'));
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

  const openEditForm = (client: Client) => {
    setEditingId(client.id);
    setForm({
      company: client.company,
      contact: client.contact ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      country: client.country ?? '',
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

  const buildPayload = (): CreateClientPayload => ({
    company: form.company.trim(),
    contact: form.contact.trim() || undefined,
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    country: form.country.trim() || undefined,
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormErrors([]);
    setActionError('');
    setSuccessMessage('');

    try {
      if (editingId) {
        const { client } = await updateClient(editingId, buildPayload());
        setClients((current) => current.map((item) => (item.id === client.id ? client : item)));
        if (selected?.id === client.id) {
          setSelected(client);
        }
        setSuccessMessage(`Партнёр «${client.company}» обновлён`);
      } else {
        const { client } = await createClient(buildPayload());
        setClients((current) => [...current, client].sort((a, b) => a.company.localeCompare(b.company)));
        setSuccessMessage(`Партнёр «${client.company}» создан`);
      }
      setShowForm(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatValidationErrors(error.validationErrors));
      } else {
        setFormErrors([getActionErrorMessage(error, 'Не удалось сохранить партнёра.')]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Удалить партнёра «${client.company}»?`)) {
      return;
    }

    setDeleting(true);
    setActionError('');
    setSuccessMessage('');

    try {
      await deleteClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
      if (selected?.id === client.id) {
        setSelected(null);
      }
      setSuccessMessage(`Партнёр «${client.company}» удалён`);
    } catch (error) {
      setActionError(getActionErrorMessage(error, 'Не удалось удалить партнёра.'));
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

  if (loadError && clients.length === 0) {
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
          Всего партнёров: <strong>{clients.length}</strong>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openCreateForm}
            style={{ padding: '8px 18px', background: '#16834A', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            + Добавить партнёра
          </button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 720 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Компания', 'Контакт', 'Email', 'Телефон', 'Страна', ''].map((heading) => (
                <th key={heading || 'actions'} style={{ textAlign: 'left', padding: '11px 14px', color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 800 }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const isSelected = selected?.id === client.id;
              return (
                <tr
                  key={client.id}
                  onClick={() => setSelected(isSelected ? null : client)}
                  style={{ borderBottom: '1px solid #F1F5F9', background: isSelected ? '#F8FAFC' : '#fff', cursor: 'pointer' }}
                >
                  <td style={{ padding: '13px 14px', fontWeight: 800, color: '#0F172A' }}>{client.company}</td>
                  <td style={{ padding: '13px 14px', color: '#64748B' }}>{client.contact || '—'}</td>
                  <td style={{ padding: '13px 14px', color: '#64748B' }}>{client.email || '—'}</td>
                  <td style={{ padding: '13px 14px', color: '#64748B' }}>{client.phone || '—'}</td>
                  <td style={{ padding: '13px 14px', color: '#64748B' }}>{client.country || '—'}</td>
                  <td style={{ padding: '13px 14px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {canUpdate && (
                        <button type="button" onClick={() => openEditForm(client)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          Изменить
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" onClick={() => void handleDelete(client)} disabled={deleting} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 11, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                          Удалить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>{selected.company}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12 }}>
            {[
              ['Контакт', selected.contact || '—'],
              ['Email', selected.email || '—'],
              ['Телефон', selected.phone || '—'],
              ['Страна', selected.country || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ color: '#0F172A', fontWeight: 700, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>
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
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{editingId ? 'Редактировать партнёра' : 'Новый партнёр'}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Клиент / партнёр компании</div>
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
                { key: 'company', label: 'Компания *', required: true },
                { key: 'contact', label: 'Контактное лицо' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'Телефон' },
                { key: 'country', label: 'Страна' },
              ].map((field) => (
                <label key={field.key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>{field.label}</div>
                  <input
                    type={field.type ?? 'text'}
                    required={field.required}
                    value={form[field.key as keyof ClientFormState]}
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
                <button type="button" onClick={() => void handleSubmit()} disabled={submitting} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: submitting ? '#86EFAC' : '#16834A', color: '#fff', fontWeight: 700, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer' }}>
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

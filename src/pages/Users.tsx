import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  UserX,
  X,
} from 'lucide-react';
import {
  ApiError,
  createUser,
  deactivateUser,
  getUsers,
  handleApiLoadFailure,
  updateUser,
} from '../api';
import { canAccessPage, roleLabels } from '../auth/roles';
import ApiLoadErrorPanel from '../components/ApiLoadErrorPanel';
import FormErrorList from '../components/FormErrorList';
import InlineConfirm from '../components/InlineConfirm';
import PageLoading from '../components/PageLoading';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import type { ApiPlatformUser, CreateUserPayload, UpdateUserPayload } from '../types/api';
import type { UserRole } from '../types/auth';
import { formatFieldErrors, showApiMutationError } from '../utils/apiErrors';
import { hasRequiredStrings } from '../utils/formValidation';

const roleOrder: UserRole[] = ['admin', 'manager', 'operator', 'finance', 'viewer'];

const roleMeta: Record<UserRole, { label: string; group: string; color: string; bg: string; description: string }> = {
  admin: {
    label: roleLabels.admin,
    group: 'Администраторы',
    color: '#047857',
    bg: '#D1FAE5',
    description: 'Полный доступ к системе и пользователям',
  },
  manager: {
    label: roleLabels.manager,
    group: 'Менеджеры',
    color: '#2563EB',
    bg: '#DBEAFE',
    description: 'Грузы, партнёры и команда',
  },
  operator: {
    label: roleLabels.operator,
    group: 'Операторы',
    color: '#0F766E',
    bg: '#CCFBF1',
    description: 'Статусы грузов и контрольные точки',
  },
  finance: {
    label: roleLabels.finance,
    group: 'Финансы',
    color: '#B45309',
    bg: '#FEF3C7',
    description: 'Счета, оплаты и отчёты',
  },
  viewer: {
    label: roleLabels.viewer,
    group: 'Наблюдатели',
    color: '#475569',
    bg: '#F1F5F9',
    description: 'Только просмотр данных',
  },
};

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  accountId: string;
  isActive: boolean;
}

const emptyForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'manager',
  accountId: '',
  isActive: true,
};

const fieldLabels: Record<string, string> = {
  name: 'Имя',
  email: 'Email',
  password: 'Пароль',
  role: 'Роль',
  accountId: 'Аккаунт',
  isActive: 'Активен',
  user: 'Пользователь',
};

function initials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

function mapUserFieldError(field: string, message: string): string | undefined {
  if (field === 'user' && /own account/i.test(message)) {
    return 'Нельзя деактивировать свой аккаунт.';
  }
  if (field === 'user' && /last active admin/i.test(message)) {
    return 'Нельзя деактивировать последнего активного администратора.';
  }
  if (field === 'password' && /min/i.test(message)) {
    return 'Пароль: минимум 8 символов.';
  }
  if (field === 'email' && /valid email|email/i.test(message)) {
    return 'Укажите корректный email.';
  }
  return undefined;
}

function userToForm(user: ApiPlatformUser): UserFormState {
  return {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    accountId: user.accountId ?? '',
    isActive: user.isActive,
  };
}

function parseAccountId(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formToCreatePayload(form: UserFormState): CreateUserPayload {
  const accountId = parseAccountId(form.accountId);
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    role: form.role,
    ...(accountId !== undefined ? { accountId } : {}),
    isActive: form.isActive,
  };
}

function formToUpdatePayload(form: UserFormState): UpdateUserPayload {
  const accountId = parseAccountId(form.accountId);
  const payload: UpdateUserPayload = {
    name: form.name.trim(),
    email: form.email.trim(),
    role: form.role,
    isActive: form.isActive,
    ...(accountId !== undefined ? { accountId } : {}),
  };
  if (form.password.trim()) {
    payload.password = form.password;
  }
  return payload;
}

function RolePill({ role }: { role: UserRole }) {
  const meta = roleMeta[role];
  return (
    <span className="users-role-pill" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

function clientValidationErrors(form: UserFormState, isCreate: boolean): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) errors.push('Имя: обязательное поле.');
  if (!form.email.trim()) {
    errors.push('Email: обязательное поле.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.push('Укажите корректный email.');
  }
  if (isCreate) {
    if (!form.password) {
      errors.push('Пароль: обязательное поле.');
    } else if (form.password.length < 8) {
      errors.push('Пароль: минимум 8 символов.');
    }
  } else if (form.password && form.password.length < 8) {
    errors.push('Пароль: минимум 8 символов.');
  }
  const accountId = parseAccountId(form.accountId);
  if (form.accountId.trim() && accountId === undefined) {
    errors.push('Аккаунт: укажите числовой ID или оставьте поле пустым.');
  }
  return errors;
}

export default function Users() {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const canManage = authUser ? canAccessPage(authUser.role, 'users') : false;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<ApiPlatformUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiPlatformUser | null>(null);
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);

  const loadUserList = useCallback(async () => {
    const { users: list } = await getUsers(100);
    setUsers(list);
    return list;
  }, []);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    loadUserList()
      .then(() => setLoadError(null))
      .catch((error) => setLoadError(handleApiLoadFailure(error).message))
      .finally(() => setLoading(false));
  }, [canManage, loadUserList]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesQuery = !query
      || user.name.toLowerCase().includes(query.toLowerCase())
      || user.email.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesQuery && matchesRole;
  }), [query, roleFilter, users]);

  const groupedUsers = useMemo(() => roleOrder
    .map((role) => ({
      role,
      title: roleMeta[role].group,
      users: filteredUsers.filter((user) => user.role === role),
    }))
    .filter((group) => group.users.length > 0), [filteredUsers]);

  const openCreateModal = () => {
    setForm({ ...emptyForm, password: '' });
    setFormErrors([]);
    setShowPassword(false);
    setEditingId(null);
    setModalMode('create');
  };

  const openEditModal = (user: ApiPlatformUser) => {
    setForm(userToForm(user));
    setFormErrors([]);
    setShowPassword(false);
    setEditingId(user.id);
    setModalMode('edit');
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setEditingId(null);
    setFormErrors([]);
  };

  const handleSave = async () => {
    const isCreate = modalMode === 'create';
    const clientErrors = clientValidationErrors(form, isCreate);
    if (clientErrors.length > 0) {
      setFormErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setFormErrors([]);

    try {
      if (isCreate) {
        const { user } = await createUser(formToCreatePayload(form));
        await loadUserList();
        showToast(`Пользователь ${user.name} создан`);
      } else if (editingId) {
        const { user } = await updateUser(editingId, formToUpdatePayload(form));
        await loadUserList();
        showToast(`Пользователь ${user.name} обновлён`);
      }
      closeModal();
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors, fieldLabels, mapUserFieldError));
      } else if (error instanceof ApiError) {
        setFormErrors([error.message]);
      } else {
        setFormErrors(['Не удалось сохранить пользователя. Проверьте подключение к API.']);
      }
      showApiMutationError(showToast, error, 'Не удалось сохранить пользователя.', {
        fieldLabels,
        mapMessage: mapUserFieldError,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;

    const targetName = deactivateTarget.name;
    const targetId = deactivateTarget.id;

    setDeactivateSubmitting(true);
    setFormErrors([]);

    try {
      await deactivateUser(targetId);
      await loadUserList();
      if (modalMode === 'edit' && editingId === targetId) {
        closeModal();
      }
      setDeactivateTarget(null);
      showToast(`Пользователь ${targetName} деактивирован`);
    } catch (error) {
      showApiMutationError(showToast, error, 'Не удалось деактивировать пользователя.', {
        fieldLabels,
        mapMessage: mapUserFieldError,
      });
      if (error instanceof ApiError && error.validationErrors) {
        setFormErrors(formatFieldErrors(error.validationErrors, fieldLabels, mapUserFieldError));
      }
    } finally {
      setDeactivateSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="users-page" style={{ padding: '20px 28px' }}>
        <div className="users-forbidden">
          <ShieldCheck size={22} />
          <div>
            <div style={{ fontWeight: 800, color: '#0F172A' }}>Доступ запрещён</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Управление пользователями доступно только администратору.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageLoading />;
  }

  if (loadError) {
    return <ApiLoadErrorPanel message={loadError} />;
  }

  const isCreate = modalMode === 'create';

  return (
    <div className="users-page">
      <section className="users-card users-card--header">
        <div className="users-header-row">
          <div className="users-header-title">
            <div className="users-header-icon">
              <UsersRound size={19} />
            </div>
            <div>
              <div className="users-title">Пользователи и роли</div>
              <div className="users-subtitle">
                Учётные записи API: создание, редактирование и деактивация.
              </div>
            </div>
          </div>
          <button type="button" className="users-btn-primary" onClick={openCreateModal}>
            <Plus size={15} />
            Добавить пользователя
          </button>
        </div>
      </section>

      <div className="users-stats-grid">
        {roleOrder.map((role) => {
          const count = users.filter((user) => user.role === role).length;
          const meta = roleMeta[role];
          return (
            <div key={role} className="users-stat-card">
              <div className="users-stat-card__top">
                <div className="users-stat-card__label">{meta.label}</div>
                <div className="users-stat-card__icon" style={{ background: meta.bg, color: meta.color }}>
                  {role === 'finance' ? <ShieldCheck size={15} /> : <UserRound size={15} />}
                </div>
              </div>
              <div className="users-stat-card__count">{count}</div>
              <div className="users-stat-card__desc">{meta.description}</div>
            </div>
          );
        })}
      </div>

      <section className="users-card">
        <div className="users-toolbar">
          <div>
            <div className="users-toolbar__title">Список пользователей</div>
            <div className="users-toolbar__hint">Всего: {users.length}</div>
          </div>
          <div className="users-toolbar__filters">
            <div className="users-search">
              <Search size={14} color="#94A3B8" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск имени или email…"
                aria-label="Поиск пользователей"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
              aria-label="Фильтр по роли"
            >
              <option value="all">Все роли</option>
              {roleOrder.map((role) => (
                <option key={role} value={role}>{roleMeta[role].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                {['Пользователь', 'Роль', 'Аккаунт', 'Активен', ''].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="users-table__empty">Пользователи не найдены</td>
                </tr>
              ) : groupedUsers.map((group) => (
                <Fragment key={group.role}>
                  <tr className="users-table__group">
                    <td colSpan={5}>
                      {group.title}
                      <span> · {group.users.length}</span>
                    </td>
                  </tr>
                  {group.users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="users-table__user">
                          <div className="users-avatar" style={{ background: roleMeta[user.role].bg, color: roleMeta[user.role].color }}>
                            {initials(user.name)}
                          </div>
                          <div>
                            <div className="users-table__name">{user.name}</div>
                            <div className="users-table__email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><RolePill role={user.role} /></td>
                      <td className="users-table__muted">{user.accountId ?? '—'}</td>
                      <td>
                        <span className={`users-active-pill ${user.isActive ? 'users-active-pill--yes' : 'users-active-pill--no'}`}>
                          {user.isActive ? 'Да' : 'Нет'}
                        </span>
                      </td>
                      <td>
                        <div className="users-row-actions">
                          <button type="button" className="users-icon-btn" aria-label={`Редактировать ${user.name}`} onClick={() => openEditModal(user)}>
                            <Pencil size={14} />
                          </button>
                          {user.isActive && (
                            <button
                              type="button"
                              className="users-icon-btn users-icon-btn--danger"
                              aria-label={`Деактивировать ${user.name}`}
                              onClick={() => setDeactivateTarget(user)}
                            >
                              <UserX size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalMode && (
        <div className="users-modal-backdrop" role="presentation">
          <div className="users-modal" role="dialog" aria-modal="true" aria-labelledby="users-modal-title">
            <div className="users-modal__header">
              <div>
                <div id="users-modal-title" className="users-modal__title">
                  {isCreate ? 'Новый пользователь' : 'Редактирование пользователя'}
                </div>
                <div className="users-modal__subtitle">
                  {isCreate ? 'Укажите логин, пароль и роль для входа в систему.' : 'Измените данные или сбросьте пароль.'}
                </div>
              </div>
              <button type="button" className="users-modal__close" onClick={closeModal} aria-label="Закрыть">
                <X size={19} />
              </button>
            </div>

            <div className="users-modal__body">
              <FormErrorList errors={formErrors} />

              <div className="users-form-grid users-form-grid--2">
                <label>
                  <span className="users-label">Имя *</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    disabled={submitting}
                  />
                </label>
                <label>
                  <span className="users-label">Роль *</span>
                  <div className="users-select-wrap">
                    <select
                      value={form.role}
                      onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                      disabled={submitting}
                    >
                      {roleOrder.map((role) => (
                        <option key={role} value={role}>{roleMeta[role].label}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} color="#94A3B8" />
                  </div>
                </label>
              </div>

              <label>
                <span className="users-label">Email / логин *</span>
                <div className="users-input-icon">
                  <Mail size={15} color="#94A3B8" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </label>

              <label>
                <span className="users-label">{isCreate ? 'Пароль *' : 'Новый пароль (необязательно)'}</span>
                <div className="users-input-icon">
                  <KeyRound size={15} color="#94A3B8" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    disabled={submitting}
                    autoComplete={isCreate ? 'new-password' : 'off'}
                  />
                  <button type="button" className="users-password-toggle" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div className="users-form-grid users-form-grid--2">
                <label>
                  <span className="users-label">ID аккаунта</span>
                  <input
                    inputMode="numeric"
                    value={form.accountId}
                    onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
                    placeholder="Необязательно"
                    disabled={submitting}
                  />
                </label>
                {!isCreate && (
                  <label>
                    <span className="users-label">Активен</span>
                    <div className="users-select-wrap">
                      <select
                        value={form.isActive ? 'yes' : 'no'}
                        onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'yes' }))}
                        disabled={submitting}
                      >
                        <option value="yes">Да</option>
                        <option value="no">Нет</option>
                      </select>
                      <ChevronDown size={16} color="#94A3B8" />
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="users-modal__footer">
              <button type="button" className="users-btn-secondary" onClick={closeModal} disabled={submitting}>
                Отмена
              </button>
              <div className="users-modal__footer-actions">
                {!isCreate && editingId && users.find((u) => u.id === editingId)?.isActive && (
                  <button
                    type="button"
                    className="users-btn-danger-outline"
                    disabled={submitting}
                    onClick={() => {
                      const target = users.find((u) => u.id === editingId);
                      if (target) setDeactivateTarget(target);
                    }}
                  >
                    <UserX size={15} />
                    Деактивировать
                  </button>
                )}
                <button
                  type="button"
                  className="users-btn-primary"
                  disabled={submitting || !(isCreate
                    ? hasRequiredStrings(form.name, form.email, form.password)
                    : hasRequiredStrings(form.name, form.email))}
                  onClick={() => void handleSave()}
                >
                  <Check size={15} />
                  {submitting ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deactivateTarget && (
        <div className="users-modal-backdrop" role="presentation">
          <div className="users-confirm-panel">
            <InlineConfirm
              message={(
                <>
                  Деактивировать «{deactivateTarget.name}»?
                  <div style={{ marginTop: 6, fontWeight: 500, color: '#B91C1C' }}>
                    Пользователь не сможет войти. Активность можно вернуть при редактировании.
                  </div>
                </>
              )}
              confirming={deactivateSubmitting}
              confirmLabel="Деактивировать"
              confirmingLabel="Деактивация…"
              errors={formErrors}
              onConfirm={() => void handleDeactivateConfirm()}
              onCancel={() => {
                if (!deactivateSubmitting) {
                  setDeactivateTarget(null);
                  setFormErrors([]);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

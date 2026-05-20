import { Fragment, type ReactNode, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';

type UserRole = 'admin' | 'head' | 'manager' | 'finance';

interface AccessMap {
  dashboard: boolean;
  shipments: boolean;
  finance: boolean;
  users: boolean;
  telegram: boolean;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  telegram: string;
  receives: string;
  dataAccess: string;
  lastLogin: string;
  active: boolean;
  access: AccessMap;
  duplicateToManagers: string[];
}

const roleMeta: Record<UserRole, { label: string; group: string; color: string; bg: string; description: string }> = {
  admin: {
    label: 'Администратор',
    group: 'Администраторы',
    color: '#047857',
    bg: '#D1FAE5',
    description: 'Полный доступ к системе и пользователям',
  },
  head: {
    label: 'Руководитель отдела',
    group: 'Руководители',
    color: '#7C3AED',
    bg: '#EDE9FE',
    description: 'Контроль менеджеров, грузов и отчётов',
  },
  manager: {
    label: 'Менеджер',
    group: 'Менеджеры',
    color: '#2563EB',
    bg: '#DBEAFE',
    description: 'Контроль грузов, маршрутов и клиентов',
  },
  finance: {
    label: 'Финансист',
    group: 'Финансы',
    color: '#B45309',
    bg: '#FEF3C7',
    description: 'Счета, оплаты и долги клиентов',
  },
};

const accessLabels: Record<keyof AccessMap, string> = {
  dashboard: 'Главная панель',
  shipments: 'Грузы и маршруты',
  finance: 'Финансы',
  users: 'Пользователи',
  telegram: 'Telegram',
};

const defaultAccessByRole: Record<UserRole, AccessMap> = {
  admin: { dashboard: true, shipments: true, finance: true, users: true, telegram: true },
  head: { dashboard: true, shipments: true, finance: true, users: false, telegram: true },
  manager: { dashboard: true, shipments: true, finance: false, users: false, telegram: true },
  finance: { dashboard: true, shipments: false, finance: true, users: false, telegram: true },
};

const initialUsers: PlatformUser[] = [
  {
    id: 'u1',
    name: 'Администратор',
    email: 'agasi@gmail.com',
    password: 'Admin2026!',
    role: 'admin',
    telegram: '—',
    receives: 'Все уведомления',
    dataAccess: 'Все разделы',
    lastLogin: '19 мая 2026 г., 18:57',
    active: true,
    access: defaultAccessByRole.admin,
    duplicateToManagers: ['u3', 'u4', 'u5'],
  },
  {
    id: 'u2',
    name: 'Жамшид Шукуров',
    email: 'jemys@gmail.com',
    password: 'Manager#442',
    role: 'head',
    telegram: '@jamshid_ops',
    receives: 'Все менеджеры отдела',
    dataAccess: 'Грузы, финансы, Telegram',
    lastLogin: '07 мая 2026 г., 20:37',
    active: true,
    access: defaultAccessByRole.head,
    duplicateToManagers: ['u3', 'u4'],
  },
  {
    id: 'u3',
    name: 'allpeace',
    email: 'aimi@events.com',
    password: 'Cargo7781',
    role: 'manager',
    telegram: '@all_peace',
    receives: 'Свои партнёры',
    dataAccess: 'Только назначенные грузы',
    lastLogin: '—',
    active: true,
    access: defaultAccessByRole.manager,
    duplicateToManagers: [],
  },
  {
    id: 'u4',
    name: 'DkRoman',
    email: 'romanr@events.com',
    password: 'Roman2026',
    role: 'manager',
    telegram: '@DkRoman',
    receives: 'Свои партнёры',
    dataAccess: 'Только назначенные грузы',
    lastLogin: '19 мая 2026 г., 19:22',
    active: true,
    access: defaultAccessByRole.manager,
    duplicateToManagers: [],
  },
  {
    id: 'u5',
    name: 'Kos Gor',
    email: 'kosty@events.com',
    password: 'KosGor915',
    role: 'manager',
    telegram: '@KosGor',
    receives: 'Свои партнёры',
    dataAccess: 'Только назначенные грузы',
    lastLogin: '19 мая 2026 г., 19:35',
    active: true,
    access: defaultAccessByRole.manager,
    duplicateToManagers: [],
  },
  {
    id: 'u6',
    name: 'Марфуна',
    email: 'mafuna@events.com',
    password: 'Finance$26',
    role: 'finance',
    telegram: '—',
    receives: 'Только счёт-фактуры',
    dataAccess: 'Финансы: 5 разделов',
    lastLogin: '05 мая 2026 г., 16:54',
    active: true,
    access: defaultAccessByRole.finance,
    duplicateToManagers: ['u3', 'u4', 'u5'],
  },
];

const emptyUser: PlatformUser = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'manager',
  telegram: '',
  receives: 'Свои партнёры',
  dataAccess: 'Только назначенные грузы',
  lastLogin: '—',
  active: true,
  access: defaultAccessByRole.manager,
  duplicateToManagers: [],
};

function initials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

function RolePill({ role }: { role: UserRole }) {
  const meta = roleMeta[role];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      background: meta.bg,
      color: meta.color,
      fontSize: 11,
      fontWeight: 800,
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

function SectionCard({ children }: { children: ReactNode }) {
  return (
    <section style={{
      background: '#fff',
      border: '1px solid #EEF2FF',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {children}
    </section>
  );
}

export default function Users() {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesQuery = !query
      || user.name.toLowerCase().includes(query.toLowerCase())
      || user.email.toLowerCase().includes(query.toLowerCase())
      || user.telegram.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesQuery && matchesRole;
  }), [query, roleFilter, users]);

  const groupedUsers = useMemo(() => {
    const order: UserRole[] = ['admin', 'head', 'manager', 'finance'];
    return order
      .map((role) => ({
        role,
        title: roleMeta[role].group,
        users: filteredUsers.filter((user) => user.role === role),
      }))
      .filter((group) => group.users.length > 0);
  }, [filteredUsers]);

  const managers = users.filter((user) => user.role === 'manager');

  const openCreateModal = () => {
    setShowPassword(false);
    setEditingUser({ ...emptyUser, id: `u-${Date.now()}`, password: 'NewUser2026!' });
  };

  const saveUser = () => {
    if (!editingUser) return;
    setUsers((current) => {
      const exists = current.some((user) => user.id === editingUser.id);
      return exists
        ? current.map((user) => (user.id === editingUser.id ? editingUser : user))
        : [editingUser, ...current];
    });
    setEditingUser(null);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2600);
  };

  const updateEditingUser = <K extends keyof PlatformUser>(key: K, value: PlatformUser[K]) => {
    setEditingUser((user) => user ? { ...user, [key]: value } : user);
  };

  const changeRole = (role: UserRole) => {
    setEditingUser((user) => user ? {
      ...user,
      role,
      access: defaultAccessByRole[role],
      receives: role === 'finance' ? 'Только счёт-фактуры' : role === 'head' ? 'Все менеджеры отдела' : role === 'admin' ? 'Все уведомления' : 'Свои партнёры',
      dataAccess: role === 'finance' ? 'Финансы: 5 разделов' : role === 'admin' ? 'Все разделы' : role === 'head' ? 'Грузы, финансы, Telegram' : 'Только назначенные грузы',
    } : user);
  };

  const removeUser = (id: string) => {
    setUsers((current) => current.filter((user) => user.id !== id));
  };

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionCard>
        <div style={{
          padding: '20px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: '#DCFCE7',
                color: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <UsersRound size={19} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>Пользователи и роли</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                  Менеджеры контролируют грузы, финансисты — оплаты, руководители — отделы и доступы.
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              border: 'none',
              borderRadius: 10,
              background: '#16834A',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Добавить пользователя
          </button>
        </div>
      </SectionCard>

      {savedNotice && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 12,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#15803D',
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Check size={15} />
          Пользователь сохранён
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {(['admin', 'head', 'manager', 'finance'] as UserRole[]).map((role) => {
          const count = users.filter((user) => user.role === role).length;
          const meta = roleMeta[role];
          return (
            <div key={role} style={{ background: '#fff', border: '1px solid #EEF2FF', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{meta.label}</div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {role === 'finance' ? <Lock size={15} /> : role === 'manager' ? <UserRound size={15} /> : <ShieldCheck size={15} />}
                </div>
              </div>
              <div style={{ fontSize: 30, color: '#0F172A', fontWeight: 900, marginTop: 8 }}>{count}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{meta.description}</div>
            </div>
          );
        })}
      </div>

      <SectionCard>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>Кто в списке</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Секция ниже сгруппирована по ролям, как в административной панели.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                width: 260,
              }}>
                <Search size={14} color="#94A3B8" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск имени, email, Telegram..."
                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 12, color: '#0F172A' }}
                />
              </div>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
                style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#0F172A', outline: 'none' }}
              >
                <option value="all">Все роли</option>
                <option value="admin">Администраторы</option>
                <option value="head">Руководители</option>
                <option value="manager">Менеджеры</option>
                <option value="finance">Финансисты</option>
              </select>
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Пользователь', 'Роль', 'Telegram', 'Получает пуши', 'Доступ к данным', 'Последний вход', 'Активен', ''].map((heading) => (
                <th key={heading} style={{ textAlign: 'left', padding: '11px 14px', color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 900 }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedUsers.map((group) => (
              <Fragment key={group.role}>
                <tr key={`${group.role}-heading`} style={{ background: '#F1F5F9' }}>
                  <td colSpan={8} style={{ padding: '9px 14px', fontSize: 12, color: '#475569', fontWeight: 900 }}>
                    {group.title} <span style={{ color: '#94A3B8', fontWeight: 700 }}>· {group.users.length}</span>
                  </td>
                </tr>
                {group.users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: roleMeta[user.role].bg,
                          color: roleMeta[user.role].color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 900,
                        }}>
                          {initials(user.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: '#0F172A', fontWeight: 900 }}>{user.name}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}><RolePill role={user.role} /></td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: 11 }}>{user.telegram}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B', fontSize: 11 }}>{user.receives}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B', fontSize: 11 }}>{user.dataAccess}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B', fontSize: 11 }}>{user.lastLogin}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 999, background: user.active ? '#DCFCE7' : '#FEE2E2', color: user.active ? '#15803D' : '#DC2626', fontSize: 10, fontWeight: 900 }}>
                        {user.active ? 'Да' : 'Нет'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => { setEditingUser({ ...user, access: { ...user.access }, duplicateToManagers: [...user.duplicateToManagers] }); setShowPassword(false); }}
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeUser(user.id)}
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #FEE2E2', background: '#fff', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.48)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            width: 920,
            maxWidth: '96vw',
            maxHeight: '92vh',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 22,
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ padding: '26px 30px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 21, color: '#0F172A', fontWeight: 950, letterSpacing: -0.4 }}>Карточка пользователя</div>
                <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 5 }}>Логин, пароль, роли, Telegram-доступы и история входа</div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{ width: 38, height: 38, border: 'none', borderRadius: 12, background: '#F8FAFC', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={19} />
              </button>
            </div>

            <div style={{ padding: '22px 30px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#F7F8FA', borderRadius: 18, padding: 18, border: '1px solid #EEF2F7', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Имя *</div>
                  <input
                    value={editingUser.name}
                    onChange={(event) => updateEditingUser('name', event.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', outline: 'none', fontSize: 14, color: '#0F172A' }}
                  />
                </label>
                <label>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Telegram</div>
                  <input
                    value={editingUser.telegram}
                    onChange={(event) => updateEditingUser('telegram', event.target.value)}
                    placeholder="@username"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', outline: 'none', fontSize: 14, color: '#0F172A' }}
                  />
                </label>
              </div>

              <label>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Email / логин для входа *</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E2E8F0', borderRadius: 12, padding: '0 12px' }}>
                  <Mail size={15} color="#94A3B8" />
                  <input
                    value={editingUser.email}
                    onChange={(event) => updateEditingUser('email', event.target.value)}
                    style={{ flex: 1, border: 'none', padding: '12px 0', outline: 'none', fontSize: 14, color: '#0F172A' }}
                  />
                </div>
              </label>

              <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F0F7FF', color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>
                Текущий пароль хранится в зашифрованном виде. В прототипе можно раскрыть поле, чтобы проверить UX просмотра и смены доступа.
              </div>

              <label>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Пароль / новый пароль</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E2E8F0', borderRadius: 12, padding: '0 12px' }}>
                  <KeyRound size={15} color="#94A3B8" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editingUser.password}
                    onChange={(event) => updateEditingUser('password', event.target.value)}
                    style={{ flex: 1, border: 'none', padding: '12px 0', outline: 'none', fontSize: 14, color: '#0F172A' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', display: 'flex' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Роль</div>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={editingUser.role}
                      onChange={(event) => changeRole(event.target.value as UserRole)}
                      style={{ width: '100%', appearance: 'none', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 38px 12px 14px', outline: 'none', fontSize: 14, color: '#0F172A', background: '#fff' }}
                    >
                      <option value="admin">Администратор</option>
                      <option value="head">Руководитель отдела</option>
                      <option value="manager">Менеджер</option>
                      <option value="finance">Финансист</option>
                    </select>
                    <ChevronDown size={16} color="#94A3B8" style={{ position: 'absolute', right: 12, top: 14, pointerEvents: 'none' }} />
                  </div>
                </label>
                <label>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Активен</div>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={editingUser.active ? 'yes' : 'no'}
                      onChange={(event) => updateEditingUser('active', event.target.value === 'yes')}
                      style={{ width: '100%', appearance: 'none', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 38px 12px 14px', outline: 'none', fontSize: 14, color: '#0F172A', background: '#fff' }}
                    >
                      <option value="yes">Да</option>
                      <option value="no">Нет</option>
                    </select>
                    <ChevronDown size={16} color="#94A3B8" style={{ position: 'absolute', right: 12, top: 14, pointerEvents: 'none' }} />
                  </div>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #EEF2FF' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase' }}>Последний вход</div>
                  <div style={{ marginTop: 5, color: '#0F172A', fontSize: 13, fontWeight: 800 }}>{editingUser.lastLogin}</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #EEF2FF' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase' }}>Роль доступа</div>
                  <div style={{ marginTop: 5 }}><RolePill role={editingUser.role} /></div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#0F172A', fontWeight: 900, marginBottom: 8 }}>Доступ к разделам аккаунта</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(Object.keys(accessLabels) as Array<keyof AccessMap>).map((key) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', background: editingUser.access[key] ? '#F0FDF4' : '#fff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editingUser.access[key]}
                        onChange={(event) => updateEditingUser('access', { ...editingUser.access, [key]: event.target.checked })}
                        style={{ width: 15, height: 15, accentColor: '#16834A' }}
                      />
                      <span style={{ fontSize: 12, color: '#334155', fontWeight: 700 }}>{accessLabels[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#0F172A', fontWeight: 900, marginBottom: 8 }}>Копии в Telegram</div>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <select
                    value={editingUser.receives}
                    onChange={(event) => updateEditingUser('receives', event.target.value)}
                    style={{ width: '100%', appearance: 'none', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 38px 12px 14px', outline: 'none', fontSize: 13, color: '#0F172A', background: '#fff' }}
                  >
                    <option>Нет — только отмеченные ниже менеджеры</option>
                    <option>Все уведомления</option>
                    <option>Все менеджеры отдела</option>
                    <option>Свои партнёры</option>
                    <option>Только счёт-фактуры</option>
                  </select>
                  <ChevronDown size={16} color="#94A3B8" style={{ position: 'absolute', right: 12, top: 14, pointerEvents: 'none' }} />
                </div>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {managers.map((manager) => (
                    <label key={manager.id} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editingUser.duplicateToManagers.includes(manager.id)}
                        onChange={(event) => {
                          const ids = event.target.checked
                            ? [...editingUser.duplicateToManagers, manager.id]
                            : editingUser.duplicateToManagers.filter((id) => id !== manager.id);
                          updateEditingUser('duplicateToManagers', ids);
                        }}
                        style={{ width: 15, height: 15, accentColor: '#16834A' }}
                      />
                      <span style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>{manager.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8' }}>{manager.telegram}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#94A3B8', lineHeight: 1.45 }}>
                  Руководитель или финансист может получать дубликаты уведомлений по выбранным менеджерам.
                </div>
              </div>

              <div style={{ paddingTop: 14, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  onClick={() => setEditingUser(null)}
                  style={{ padding: '11px 22px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  Отмена
                </button>
                <button
                  onClick={saveUser}
                  style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: '#16834A', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Bell size={15} />
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

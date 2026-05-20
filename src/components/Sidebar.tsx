import { type Page } from '../App';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: '▦' },
  { id: 'shipments', label: 'Грузы', icon: '⬡' },
  { id: 'tracking', label: 'Отслеживание', icon: '◎' },
  { id: 'managers', label: 'Менеджеры', icon: '◈' },
  { id: 'finance', label: 'Финансы', icon: '▤' },
  { id: 'users', label: 'Пользователи', icon: '◉' },
  { id: 'archive', label: 'Архив', icon: '▣' },
  { id: 'telegram', label: 'Telegram-бот', icon: '✈' },
];

const bottomItems: { id: Page; label: string; icon: string }[] = [
  { id: 'settings', label: 'Настройки', icon: '⚙' },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside style={{ width: 220, minHeight: '100vh', background: '#1E293B', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 700,
          }}>L</div>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>LOGISTIX</div>
            <div style={{ color: '#64748B', fontSize: 10, letterSpacing: 1 }}>B2B PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, fontWeight: 600, paddingLeft: 12, paddingBottom: 8, paddingTop: 4 }}>НАВИГАЦИЯ</div>
        {navItems.map(item => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? '#3B82F6' : 'transparent',
                color: active ? '#fff' : '#94A3B8',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {bottomItems.map(item => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? '#3B82F6' : 'transparent',
                color: active ? '#fff' : '#94A3B8',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>АД</div>
          <div>
            <div style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600 }}>Админ</div>
            <div style={{ color: '#64748B', fontSize: 10 }}>Суперадмин</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

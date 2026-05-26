import { LogOut } from 'lucide-react';
import { type Page } from '../App';
import { canAccessPage, roleLabels, userInitials } from '../auth/roles';
import type { AuthUser } from '../types/auth';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: AuthUser | null;
  onLogout?: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: '▦' },
  { id: 'shipments', label: 'Грузы', icon: '⬡' },
  { id: 'tracking', label: 'Отслеживание', icon: '◎' },
  { id: 'managers', label: 'Менеджеры', icon: '◈' },
  { id: 'clients', label: 'Партнёры', icon: '◇' },
  { id: 'finance', label: 'Финансы', icon: '▤' },
  { id: 'users', label: 'Пользователи', icon: '◉' },
  { id: 'archive', label: 'Архив', icon: '▣' },
  { id: 'telegram', label: 'Telegram-бот', icon: '✈' },
];

const bottomItems: { id: Page; label: string; icon: string }[] = [
  { id: 'settings', label: 'Настройки', icon: '⚙' },
];

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: Page; label: string; icon: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        background: active ? '#3B82F6' : 'transparent',
        color: active ? '#fff' : '#94A3B8',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s',
        textAlign: 'left',
        width: '100%',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
      {item.label}
    </button>
  );
}

export default function Sidebar({
  currentPage,
  onNavigate,
  user,
  onLogout,
  isMobile = false,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const visibleNavItems = user
    ? navItems.filter((item) => canAccessPage(user.role, item.id))
    : navItems;

  const visibleBottomItems = user
    ? bottomItems.filter((item) => canAccessPage(user.role, item.id))
    : bottomItems;

  const displayName = user?.name ?? 'Демо';
  const displayRole = user ? roleLabels[user.role] : 'Без API';
  const initials = user ? userInitials(user.name) : 'ДМ';

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    if (isMobile) onClose?.();
  };

  const sidebarClass = ['app-sidebar', isMobile && mobileOpen ? 'app-sidebar--open' : ''].filter(Boolean).join(' ');

  return (
    <>
      {isMobile && mobileOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Закрыть меню"
          onClick={onClose}
        />
      )}
      <aside className={sidebarClass} aria-label="Навигация" aria-hidden={isMobile && !mobileOpen}>
        <div className="app-sidebar__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: '#fff',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              L
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>LOGISTIX</div>
              <div style={{ color: '#64748B', fontSize: 10, letterSpacing: 1 }}>B2B PLATFORM</div>
            </div>
          </div>
        </div>

        <nav className="app-sidebar__nav sidebar-nav-scroll" aria-label="Разделы приложения">
          <div className="app-sidebar__nav-label">НАВИГАЦИЯ</div>
          {visibleNavItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => handleNavigate(item.id)}
            />
          ))}
        </nav>

        <div className="app-sidebar__footer">
          {visibleBottomItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => handleNavigate(item.id)}
            />
          ))}
          <div className="app-sidebar__user-row">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: '#E2E8F0',
                  fontSize: 12,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </div>
              <div style={{ color: '#64748B', fontSize: 10 }}>{displayRole}</div>
            </div>
          </div>
          {onLogout && (
            <button type="button" className="app-sidebar__logout-btn" onClick={onLogout}>
              <LogOut size={14} aria-hidden />
              Выйти
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

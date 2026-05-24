import { useState } from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import NotificationsPanel, { useNotificationBadgeCount } from './NotificationsPanel';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Header({ title, subtitle, onMenuClick, showMenuButton = false }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = useNotificationBadgeCount();

  return (
    <>
      <header style={{
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {showMenuButton && (
            <button
              type="button"
              className="header-menu-btn"
              aria-label="Открыть меню"
              onClick={onMenuClick}
            >
              <Menu size={20} />
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{subtitle}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div className="header-search">
            <Search size={14} color="#94A3B8" />
            <input placeholder="Поиск грузов, клиентов..." />
          </div>
          {/* Bell */}
          <button
            onClick={() => setNotificationsOpen(true)}
            style={{ position: 'relative', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }}
            aria-label="Открыть уведомления"
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#FFF7ED',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706',
              border: '1px solid #FED7AA',
            }}>
              <Bell size={17} />
            </div>
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 17, height: 17, borderRadius: 999, background: '#EF4444',
                border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: '#fff', fontWeight: 900, padding: '0 4px',
              }}>{unreadCount}</div>
            )}
          </button>
          {/* Date */}
          <div className="header-date">
            {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </header>
      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </>
  );
}

import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ForbiddenBanner from './components/ForbiddenBanner';
import AuthLoadingScreen from './components/AuthLoadingScreen';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import Tracking from './pages/Tracking';
import Managers from './pages/Managers';
import Finance from './pages/Finance';
import Telegram from './pages/Telegram';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Archive from './pages/Archive';
import Login from './pages/Login';
import { canAccessPage } from './auth/roles';
import { useAuth } from './context/AuthContext';
import type { UserRole } from './types/auth';

export type Page = 'dashboard' | 'shipments' | 'tracking' | 'managers' | 'finance' | 'users' | 'archive' | 'telegram' | 'settings';

const pageTitles: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Дашборд', subtitle: 'Общая сводка по грузам и финансам' },
  shipments: { title: 'Грузы', subtitle: 'Управление и мониторинг отправлений' },
  tracking: { title: 'Отслеживание', subtitle: 'Реальное время · маршруты и контрольные точки' },
  managers: { title: 'Менеджеры', subtitle: 'Команда, регионы и активные грузы' },
  finance: { title: 'Финансы', subtitle: 'Счета, оплаты и задолженности по клиентам' },
  users: { title: 'Пользователи', subtitle: 'Роли, Telegram-доступы, логины и права аккаунта' },
  archive: { title: 'Архив', subtitle: 'Завершённые проекты, партнёры и активность по периодам' },
  telegram: { title: 'Telegram-бот', subtitle: 'Настройка уведомлений и журнал событий' },
  settings: { title: 'Настройки', subtitle: 'Профиль компании и конфигурация системы' },
};

function defaultPageForRole(role: UserRole | null): Page {
  if (role && canAccessPage(role, 'dashboard')) {
    return 'dashboard';
  }
  return 'dashboard';
}

function AppShell() {
  const { status, user, authRequired, logout, forbiddenMessage, clearForbiddenMessage } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const { title, subtitle } = pageTitles[page];

  useEffect(() => {
    if (user && !canAccessPage(user.role, page)) {
      setPage(defaultPageForRole(user.role));
    }
  }, [user, page]);

  if (authRequired && status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (authRequired && status === 'unauthenticated') {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0F2F8' }}>
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        user={user}
        onLogout={authRequired ? logout : undefined}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {forbiddenMessage && (
          <ForbiddenBanner message={forbiddenMessage} onDismiss={clearForbiddenMessage} />
        )}
        <Header title={title} subtitle={subtitle} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {page === 'dashboard' && <Dashboard />}
          {page === 'shipments' && <Shipments />}
          {page === 'tracking' && <Tracking />}
          {page === 'managers' && <Managers />}
          {page === 'finance' && <Finance />}
          {page === 'users' && <Users />}
          {page === 'archive' && <Archive />}
          {page === 'telegram' && <Telegram />}
          {page === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}

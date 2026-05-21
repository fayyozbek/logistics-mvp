import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import Tracking from './pages/Tracking';
import Managers from './pages/Managers';
import Clients from './pages/Clients';
import Finance from './pages/Finance';
import Telegram from './pages/Telegram';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Archive from './pages/Archive';

export type Page = 'dashboard' | 'shipments' | 'tracking' | 'managers' | 'clients' | 'finance' | 'users' | 'archive' | 'telegram' | 'settings';

const pageTitles: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Дашборд', subtitle: 'Общая сводка по грузам и финансам' },
  shipments: { title: 'Грузы', subtitle: 'Управление и мониторинг отправлений' },
  tracking: { title: 'Отслеживание', subtitle: 'Реальное время · маршруты и контрольные точки' },
  managers: { title: 'Менеджеры', subtitle: 'Команда, регионы и активные грузы' },
  clients: { title: 'Партнёры', subtitle: 'Клиенты и контрагенты для создания грузов' },
  finance: { title: 'Финансы', subtitle: 'Счета, оплаты и задолженности по клиентам' },
  users: { title: 'Пользователи', subtitle: 'Роли, Telegram-доступы, логины и права аккаунта' },
  archive: { title: 'Архив', subtitle: 'Завершённые проекты, партнёры и активность по периодам' },
  telegram: { title: 'Telegram-бот', subtitle: 'Настройка уведомлений и журнал событий' },
  settings: { title: 'Настройки', subtitle: 'Профиль компании и конфигурация системы' },
};

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const { title, subtitle } = pageTitles[page];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0F2F8' }}>
      <Sidebar currentPage={page} onNavigate={setPage} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <Header title={title} subtitle={subtitle} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {page === 'dashboard' && <Dashboard />}
          {page === 'shipments' && <Shipments />}
          {page === 'tracking' && <Tracking />}
          {page === 'managers' && <Managers />}
          {page === 'clients' && <Clients />}
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

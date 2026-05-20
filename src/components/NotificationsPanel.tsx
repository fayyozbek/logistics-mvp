import type { ReactNode } from 'react';
import { Bell, CheckCircle2, FolderKanban, PackageCheck, UserPlus, X } from 'lucide-react';
import { managers } from '../data/mock';

export interface NotificationItem {
  id: string;
  type: 'task' | 'shipment' | 'user' | 'finance';
  title: string;
  description: string;
  managerId: string;
  time: string;
  day: 'today' | 'yesterday';
  unread: boolean;
  priority: 'normal' | 'high' | 'urgent';
}

export const taskNotifications: NotificationItem[] = [
  {
    id: 'n1',
    type: 'task',
    title: 'Новая задача по маршруту',
    description: 'Проверить документы LGX-2026-0498 перед вылетом в FRA',
    managerId: 'm2',
    time: '19:22',
    day: 'today',
    unread: true,
    priority: 'urgent',
  },
  {
    id: 'n2',
    type: 'shipment',
    title: 'Новая точка добавлена',
    description: 'Актобе, терминал А-17 добавлен в LGX-2026-0387',
    managerId: 'm1',
    time: '18:47',
    day: 'today',
    unread: true,
    priority: 'high',
  },
  {
    id: 'n3',
    type: 'finance',
    title: 'Запрос на счёт',
    description: 'KazExport LLP запросил счёт по перевозке Алматы → Дубай',
    managerId: 'm2',
    time: '17:10',
    day: 'today',
    unread: true,
    priority: 'normal',
  },
  {
    id: 'n4',
    type: 'task',
    title: 'Задача менеджеру',
    description: 'Связаться с Global Trade GmbH по времени разгрузки',
    managerId: 'm4',
    time: '15:35',
    day: 'today',
    unread: false,
    priority: 'normal',
  },
  {
    id: 'n5',
    type: 'shipment',
    title: 'Новый груз в работе',
    description: 'Silk Road Cargo: Шанхай → Актау, морская перевозка',
    managerId: 'm3',
    time: '22:07',
    day: 'yesterday',
    unread: true,
    priority: 'high',
  },
  {
    id: 'n6',
    type: 'user',
    title: 'Новый сотрудник',
    description: 'Анна Белова добавлена как менеджер направления СНГ',
    managerId: 'm4',
    time: '20:58',
    day: 'yesterday',
    unread: true,
    priority: 'normal',
  },
  {
    id: 'n7',
    type: 'task',
    title: 'Проверка груза',
    description: 'Рустам Нуров назначил проверку веса по LGX-2026-0512',
    managerId: 'm3',
    time: '20:41',
    day: 'yesterday',
    unread: false,
    priority: 'normal',
  },
];

const typeMeta: Record<NotificationItem['type'], { color: string; bg: string; icon: ReactNode }> = {
  task: { color: '#2563EB', bg: '#DBEAFE', icon: <FolderKanban size={17} /> },
  shipment: { color: '#059669', bg: '#D1FAE5', icon: <PackageCheck size={17} /> },
  user: { color: '#7C3AED', bg: '#EDE9FE', icon: <UserPlus size={17} /> },
  finance: { color: '#B45309', bg: '#FEF3C7', icon: <CheckCircle2 size={17} /> },
};

const priorityMeta: Record<NotificationItem['priority'], { label: string; color: string; bg: string }> = {
  normal: { label: 'Обычная', color: '#64748B', bg: '#F1F5F9' },
  high: { label: 'Важная', color: '#B45309', bg: '#FEF3C7' },
  urgent: { label: 'Срочная', color: '#DC2626', bg: '#FEE2E2' },
};

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

function ManagerAvatar({ managerId }: { managerId: string }) {
  const manager = managers.find((item) => item.id === managerId);
  return (
    <div style={{
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: '#ECFDF5',
      color: '#047857',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      fontWeight: 900,
      flexShrink: 0,
    }}>
      {manager?.avatar ?? 'M'}
    </div>
  );
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const unreadCount = taskNotifications.filter((item) => item.unread).length;
  const today = taskNotifications.filter((item) => item.day === 'today');
  const yesterday = taskNotifications.filter((item) => item.day === 'yesterday');

  if (!open) return null;

  const renderGroup = (title: string, items: NotificationItem[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        padding: '0 4px',
      }}>
        {title}
      </div>
      {items.map((item) => {
        const type = typeMeta[item.type];
        const priority = priorityMeta[item.priority];
        const manager = managers.find((entry) => entry.id === item.managerId);

        return (
          <div key={item.id} style={{
            background: item.unread ? '#FFFBF5' : '#fff',
            border: `1px solid ${item.unread ? '#FED7AA' : '#EEF2FF'}`,
            borderRadius: 14,
            padding: '13px 14px',
            display: 'flex',
            gap: 12,
            position: 'relative',
          }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              background: type.bg,
              color: type.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {type.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 900 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{item.time}</div>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 1.35 }}>{item.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <ManagerAvatar managerId={item.managerId} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#334155', fontWeight: 800 }}>{manager?.name}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{manager?.telegramId}</div>
                </div>
                <span style={{
                  marginLeft: 'auto',
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: priority.bg,
                  color: priority.color,
                  fontSize: 10,
                  fontWeight: 900,
                }}>
                  {priority.label}
                </span>
              </div>
            </div>
            {item.unread && (
              <div style={{
                position: 'absolute',
                right: 12,
                top: 39,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#D97706',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 250,
      display: 'flex',
      justifyContent: 'flex-end',
      background: 'rgba(15, 23, 42, 0.44)',
      backdropFilter: 'blur(3px)',
    }}>
      <aside style={{
        width: 480,
        maxWidth: '94vw',
        height: '100vh',
        background: '#fff',
        borderLeft: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '26px 28px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 24, color: '#0F172A', fontWeight: 900, letterSpacing: -0.6 }}>Уведомления</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{unreadCount} непрочитанных задач</div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#ECFDF5', color: '#047857', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
              Прочитать все
            </button>
            <button style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #FEE2E2', background: '#fff', color: '#DC2626', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
              Очистить
            </button>
          </div>
        </div>

        <div style={{ padding: '18px 20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {[
              { label: 'Новые', value: unreadCount, color: '#D97706' },
              { label: 'Срочные', value: taskNotifications.filter((item) => item.priority === 'urgent').length, color: '#DC2626' },
              { label: 'Менеджеры', value: new Set(taskNotifications.map((item) => item.managerId)).size, color: '#2563EB' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: '#F8FAFC', border: '1px solid #EEF2FF', borderRadius: 12, padding: '11px 12px' }}>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>{stat.label}</div>
                <div style={{ fontSize: 20, color: stat.color, fontWeight: 900, marginTop: 4 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {renderGroup('Сегодня', today)}
          {renderGroup('Вчера', yesterday)}
        </div>
      </aside>
    </div>
  );
}

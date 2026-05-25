import { useEffect, useState, type ReactNode } from 'react';
import { Bell, CheckCircle2, FolderKanban, PackageCheck, Send, X } from 'lucide-react';
import { getApiErrorMessage, getTelegramNotifications, isApiConfigured } from '../api';
import { usePermissions } from '../hooks/usePermissions';
import type { TelegramNotificationEntry } from '../types/api';

interface DemoNotificationItem {
  id: string;
  type: 'task' | 'shipment' | 'finance';
  title: string;
  description: string;
  time: string;
  day: 'today' | 'yesterday';
}

const demoNotifications: DemoNotificationItem[] = [
  {
    id: 'demo-1',
    type: 'task',
    title: 'Пример задачи (демо)',
    description: 'Демо-уведомление без подключённого API',
    time: '19:22',
    day: 'today',
  },
  {
    id: 'demo-2',
    type: 'shipment',
    title: 'Пример груза (демо)',
    description: 'Реальные уведомления приходят из журнала Telegram',
    time: '18:47',
    day: 'today',
  },
];

const typeMeta: Record<string, { color: string; bg: string; icon: ReactNode }> = {
  task: { color: '#2563EB', bg: '#DBEAFE', icon: <FolderKanban size={17} /> },
  shipment: { color: '#059669', bg: '#D1FAE5', icon: <PackageCheck size={17} /> },
  shipment_created: { color: '#059669', bg: '#D1FAE5', icon: <PackageCheck size={17} /> },
  status_changed: { color: '#2563EB', bg: '#DBEAFE', icon: <FolderKanban size={17} /> },
  checkpoint_added: { color: '#7C3AED', bg: '#EDE9FE', icon: <Send size={17} /> },
  finance: { color: '#B45309', bg: '#FEF3C7', icon: <CheckCircle2 size={17} /> },
  test_message: { color: '#64748B', bg: '#F1F5F9', icon: <Send size={17} /> },
};

const eventTypeLabels: Record<string, string> = {
  shipment_created: 'Создан груз',
  status_changed: 'Статус изменён',
  checkpoint_added: 'Добавлена точка',
  test_message: 'Тестовое сообщение',
};

function formatNotificationTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function notificationTitle(entry: TelegramNotificationEntry): string {
  return eventTypeLabels[entry.eventType] ?? entry.eventType;
}

function notificationStatusLabel(status: TelegramNotificationEntry['status']): string {
  if (status === 'sent') return 'Отправлено';
  if (status === 'failed') return 'Ошибка';
  return 'Пропущено';
}

export function useNotificationBadgeCount(): number {
  const apiMode = isApiConfigured();
  const { can } = usePermissions();
  const canViewJournal = can('telegram.viewJournal');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!apiMode) {
      setCount(demoNotifications.length);
      return;
    }

    if (!canViewJournal) {
      setCount(0);
      return;
    }

    getTelegramNotifications({ limit: 50 })
      .then(({ notifications }) => {
        setCount(notifications.filter((item) => item.status === 'sent').length);
      })
      .catch(() => setCount(0));
  }, [apiMode, canViewJournal]);

  return count;
}

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const apiMode = isApiConfigured();
  const { can } = usePermissions();
  const canViewJournal = can('telegram.viewJournal');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [journalEntries, setJournalEntries] = useState<TelegramNotificationEntry[]>([]);

  useEffect(() => {
    if (!open || !apiMode || !canViewJournal) {
      return;
    }

    setLoading(true);
    setLoadError('');

    getTelegramNotifications({ limit: 50 })
      .then(({ notifications }) => setJournalEntries(notifications))
      .catch((error) => {
        setLoadError(getApiErrorMessage(error, 'Не удалось загрузить журнал Telegram.'));
        setJournalEntries([]);
      })
      .finally(() => setLoading(false));
  }, [open, apiMode, canViewJournal]);

  if (!open) return null;

  const demoMode = !apiMode;
  const placeholderMode = apiMode && !canViewJournal;
  const journalMode = apiMode && canViewJournal;

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
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {journalMode && `${journalEntries.length} записей журнала Telegram`}
                    {demoMode && 'Демо-режим без API'}
                    {placeholderMode && 'Журнал Telegram'}
                  </div>
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
        </div>

        <div style={{ padding: '18px 20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {demoMode && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 12, fontWeight: 600 }}>
              Демо-данные. Подключите API для журнала Telegram-уведомлений.
            </div>
          )}

          {placeholderMode && (
            <div style={{ padding: '16px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontSize: 13, lineHeight: 1.45 }}>
              Журнал Telegram доступен администратору и менеджеру. Для вашей роли показываются только настройки бота на странице «Telegram-бот».
            </div>
          )}

          {journalMode && loading && (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Загрузка журнала…</div>
          )}

          {journalMode && loadError && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
              {loadError}
            </div>
          )}

          {journalMode && !loading && !loadError && journalEntries.length === 0 && (
            <div style={{ padding: '16px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontSize: 13 }}>
              Записей в журнале пока нет. Отправьте тестовое сообщение или выполните действие с грузом.
            </div>
          )}

          {journalMode && journalEntries.map((entry) => {
            const type = typeMeta[entry.eventType] ?? typeMeta.test_message;
            return (
              <div key={entry.id} style={{
                background: '#fff',
                border: '1px solid #EEF2FF',
                borderRadius: 14,
                padding: '13px 14px',
                display: 'flex',
                gap: 12,
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
                    <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 900 }}>{notificationTitle(entry)}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{formatNotificationTime(entry.sentAt ?? entry.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 1.35 }}>
                    {entry.messagePreview ?? '—'}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: entry.status === 'sent' ? '#D1FAE5' : entry.status === 'failed' ? '#FEE2E2' : '#F1F5F9',
                      color: entry.status === 'sent' ? '#047857' : entry.status === 'failed' ? '#B91C1C' : '#64748B',
                      fontSize: 10,
                      fontWeight: 900,
                    }}>
                      {notificationStatusLabel(entry.status)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {demoMode && demoNotifications.map((item) => {
            const type = typeMeta[item.type];
            return (
              <div key={item.id} style={{
                background: '#FFFBF5',
                border: '1px solid #FED7AA',
                borderRadius: 14,
                padding: '13px 14px',
                display: 'flex',
                gap: 12,
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
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import {
  ApiError,
  getApiErrorMessage,
  getTelegramNotifications,
  getTelegramSettings,
  getTelegramStatus,
  sendTelegramTestMessage,
  updateTelegramSettings,
} from '../api';
import type {
  TelegramNotificationEntry,
  TelegramNotificationSettings,
  TelegramStatus,
} from '../types/api';
import { usePermissions } from '../hooks/usePermissions';
import type { Shipment } from '../data/mock';
import ApiLoadErrorBanner from '../components/ApiLoadErrorBanner';

const notificationPrefs: {
  key: keyof Pick<
    TelegramNotificationSettings,
    'notifyShipmentCreated' | 'notifyStatusChanged' | 'notifyCheckpointAdded'
  >;
  label: string;
  desc: string;
}[] = [
  { key: 'notifyShipmentCreated', label: 'Создание груза', desc: 'Уведомление при создании нового груза' },
  { key: 'notifyStatusChanged', label: 'Изменение статуса', desc: 'Доставка, задержка, в пути и другие статусы' },
  { key: 'notifyCheckpointAdded', label: 'Новая точка маршрута', desc: 'Добавление контрольной точки на маршруте' },
];

const settingsFieldLabels: Record<string, string> = {
  telegramChatId: 'Chat ID',
  chatId: 'Chat ID',
  telegramUsername: 'Имя пользователя Telegram',
  displayName: 'Отображаемое имя',
  enabled: 'Уведомления включены',
  notificationsEnabled: 'Автоуведомления',
  notifyShipmentCreated: 'Создание груза',
  notifyStatusChanged: 'Изменение статуса',
  notifyCheckpointAdded: 'Новая точка маршрута',
  botToken: 'Токен бота',
};

function formatFieldErrors(errors: Record<string, string[]>): string[] {
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((message) => {
      const label = settingsFieldLabels[field] ?? field;
      return `${label}: ${message}`;
    }),
  );
}

const journalEventTypes = [
  { value: '', label: 'Все типы' },
  { value: 'test_message', label: 'Тестовое сообщение' },
  { value: 'shipment_created', label: 'Создание груза' },
  { value: 'shipment_status_changed', label: 'Изменение статуса' },
  { value: 'checkpoint_added', label: 'Новая точка маршрута' },
];

const journalStatuses = [
  { value: '', label: 'Все статусы' },
  { value: 'sent', label: 'Отправлено' },
  { value: 'failed', label: 'Ошибка' },
  { value: 'skipped', label: 'Пропущено' },
];

const eventTypeLabels: Record<string, string> = {
  test_message: 'Тестовое сообщение',
  shipment_created: 'Создание груза',
  shipment_status_changed: 'Изменение статуса',
  checkpoint_added: 'Новая точка маршрута',
  finance_status_changed: 'Финансы',
};

const statusLabels: Record<string, string> = {
  sent: 'Отправлено',
  failed: 'Ошибка',
  skipped: 'Пропущено',
};

const statusStyles: Record<string, { bg: string; color: string; dot: string }> = {
  sent: { bg: '#F0FDF4', color: '#15803D', dot: '#10B981' },
  failed: { bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  skipped: { bg: '#FFFBEB', color: '#B45309', dot: '#F59E0B' },
};

const pagePadding = 'clamp(16px, 3vw, 28px)';

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  fontSize: 12,
  color: '#0F172A',
  background: '#F8FAFC',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#64748B',
  marginBottom: 4,
};

const selectStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  fontSize: 12,
  color: '#0F172A',
  background: '#F8FAFC',
  outline: 'none',
  minWidth: 0,
  flex: '1 1 140px',
};

function formatJournalTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatRelated(entry: TelegramNotificationEntry): string | null {
  if (!entry.relatedType || !entry.relatedId) return null;
  const typeLabel =
    entry.relatedType === 'shipment' ? 'Груз' : entry.relatedType === 'checkpoint' ? 'Точка' : entry.relatedType;
  return `${typeLabel} #${entry.relatedId}`;
}

function Toggle({
  on,
  disabled,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={on}
      style={{
        width: 42,
        height: 22,
        borderRadius: 12,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? '#3B82F6' : '#E2E8F0',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 3,
          transition: 'left 0.2s',
          left: on ? 23 : 3,
        }}
      />
    </button>
  );
}

const defaultBotStatus: TelegramStatus = {
  configured: false,
  enabled: false,
  hasChatId: false,
  notificationsEnabled: false,
  botTokenSource: null,
};

export default function Telegram() {
  const { can } = usePermissions();
  const canEditSettings = can('telegram.updateSettings');
  const canSendTest = can('telegram.testMessage');
  const canViewJournal = can('telegram.viewJournal');
  const [loading, setLoading] = useState(true);
  const [tgShipments, setTgShipments] = useState<Shipment[]>([]);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyShipmentCreated, setNotifyShipmentCreated] = useState(true);
  const [notifyStatusChanged, setNotifyStatusChanged] = useState(true);
  const [notifyCheckpointAdded, setNotifyCheckpointAdded] = useState(true);
  const [testMsg, setTestMsg] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState('');
  const [testError, setTestError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [settingsErrors, setSettingsErrors] = useState<string[]>([]);
  const [botStatus, setBotStatus] = useState<TelegramStatus>(defaultBotStatus);
  const [journalEntries, setJournalEntries] = useState<TelegramNotificationEntry[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const loadJournal = useCallback(async () => {
    setJournalLoading(true);
    setJournalError('');
    try {
      const { notifications } = await getTelegramNotifications({
        status: statusFilter || undefined,
        event_type: eventTypeFilter || undefined,
        limit: 50,
      });
      setJournalEntries(notifications);
    } catch (error) {
      setJournalEntries([]);
      if (error instanceof ApiError) {
        setJournalError(error.message);
      } else {
        setJournalError('Не удалось загрузить журнал уведомлений.');
      }
    } finally {
      setJournalLoading(false);
    }
  }, [statusFilter, eventTypeFilter]);

  const applySettings = (settings: TelegramNotificationSettings) => {
    if (settings.telegramChatId) setTelegramChatId(settings.telegramChatId);
    setTelegramUsername(settings.telegramUsername ?? '');
    setDisplayName(settings.displayName ?? '');
    setEnabled(settings.enabled);
    setNotificationsEnabled(settings.notificationsEnabled);
    setNotifyShipmentCreated(settings.notifyShipmentCreated);
    setNotifyStatusChanged(settings.notifyStatusChanged);
    setNotifyCheckpointAdded(settings.notifyCheckpointAdded);
  };

  useEffect(() => {
    void Promise.all([
      getTelegramSettings().then(({ settings, shipments: ships }) => {
        setTgShipments(ships);
        if (settings) applySettings(settings);
      }),
      getTelegramStatus().then(setBotStatus),
    ])
      .catch((error) => {
        setLoadError(getApiErrorMessage(error, 'Не удалось загрузить настройки Telegram.'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && canViewJournal) {
      void loadJournal();
    }
  }, [loading, loadJournal, canViewJournal]);

  const buildPayload = () => ({
    telegramChatId: telegramChatId || null,
    telegramUsername: telegramUsername || null,
    displayName: displayName || null,
    enabled,
    notificationsEnabled,
    notifyShipmentCreated,
    notifyStatusChanged,
    notifyCheckpointAdded,
  });

  const handleSaveSettings = async () => {
    setSubmitting(true);
    setSettingsErrors([]);
    setSuccessMessage('');

    try {
      const { settings } = await updateTelegramSettings(buildPayload());
      applySettings(settings);
      setSuccessMessage('Настройки уведомлений сохранены');
      const status = await getTelegramStatus();
      setBotStatus(status);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setSettingsErrors(formatFieldErrors(error.validationErrors));
      } else if (error instanceof ApiError) {
        setSettingsErrors([error.message]);
      } else {
        setSettingsErrors(['Не удалось сохранить настройки. Проверьте подключение к API.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendTestMessage = async () => {
    setTestSending(true);
    setTestSuccess('');
    setTestError('');
    try {
      await sendTelegramTestMessage({
        chatId: telegramChatId || undefined,
        message: testMsg || undefined,
      });
      setTestSuccess('Сообщение успешно отправлено в Telegram');
      setTestMsg('');
      void loadJournal();
      const status = await getTelegramStatus();
      setBotStatus(status);
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.message.toLowerCase();
        if (msg.includes('token') || msg.includes('токен')) {
          setTestError('Системный Telegram bot token не настроен на сервере.');
        } else if (msg.includes('chat id') || msg.includes('chat_id')) {
          setTestError('Укажите Chat ID / Group ID и сохраните настройки.');
        } else if (error.status === 502) {
          setTestError('Не удалось доставить сообщение через Telegram. Проверьте Chat ID и доступность бота.');
        } else if (error.status === 0) {
          setTestError('Нет связи с API. Проверьте VITE_API_BASE_URL.');
        } else {
          setTestError(error.message);
        }
      } else {
        setTestError('Не удалось отправить сообщение. Проверьте подключение к API.');
      }
    } finally {
      setTestSending(false);
    }
  };

  const testButtonDisabled =
    testSending || submitting || !botStatus.configured || (!telegramChatId && !botStatus.hasChatId);

  const botUsernameDisplay = botStatus.botUsername
    ? botStatus.botUsername.startsWith('@')
      ? botStatus.botUsername
      : `@${botStatus.botUsername}`
    : null;

  if (loading) {
    return (
      <div
        style={{
          padding: pagePadding,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#8B95A7',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '2.5px solid #E2E8F0',
            borderTopColor: '#0088cc',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        Загрузка...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: pagePadding }}>
        <ApiLoadErrorBanner message={loadError} />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: pagePadding,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0088cc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
          ✈
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Telegram Bot</div>
          {botUsernameDisplay && (
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{botUsernameDisplay}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: '1 1 auto', justifyContent: 'flex-end' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: 20,
              background: botStatus.configured ? '#F0FDF4' : '#FFF7ED',
              color: botStatus.configured ? '#15803D' : '#D97706',
              border: `1px solid ${botStatus.configured ? '#BBF7D0' : '#FED7AA'}`,
            }}
          >
            {botStatus.configured ? '● Системный бот настроен' : '○ Системный бот не настроен'}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: 20,
              background: botStatus.hasChatId ? '#EFF6FF' : '#F8FAFC',
              color: botStatus.hasChatId ? '#1D4ED8' : '#94A3B8',
              border: '1px solid #E2E8F0',
            }}
          >
            {botStatus.hasChatId ? '● Чат подключён' : '○ Чат не указан'}
          </span>
        </div>
      </div>

      {!botStatus.configured && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            color: '#9A3412',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Системный Telegram bot token не настроен на сервере. Обратитесь к администратору для настройки TELEGRAM_BOT_TOKEN.
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: 13, fontWeight: 700 }}>
          {successMessage}
        </div>
      )}

      {settingsErrors.length > 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13, fontWeight: 600 }}>
          {settingsErrors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
        {/* Settings */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Настройки уведомлений</div>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 14px', lineHeight: 1.45 }}>
            Укажите чат для получения уведомлений. Токен системного бота настраивается только на сервере.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={labelStyle}>Telegram Chat ID / Group ID</div>
              <input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-100xxxxxxxxxxxxx"
                disabled={submitting || !canEditSettings}
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>ID чата, группы или канала для ваших уведомлений</div>
            </div>

            <div>
              <div style={labelStyle}>Имя пользователя Telegram (необязательно)</div>
              <input
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="@username"
                disabled={submitting || !canEditSettings}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Отображаемое имя (необязательно)</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Например: Отдел логистики"
                disabled={submitting || !canEditSettings}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F1F5F9' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Уведомления включены</div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Разрешить отправку в ваш чат</div>
              </div>
              <Toggle on={enabled} disabled={submitting || !canEditSettings} onToggle={() => setEnabled((v) => !v)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Автоуведомления</div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>События по грузам и маршруту</div>
              </div>
              <Toggle on={notificationsEnabled} disabled={submitting || !canEditSettings} onToggle={() => setNotificationsEnabled((v) => !v)} />
            </div>

            {canEditSettings && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSaveSettings()}
              style={{
                width: '100%',
                padding: '10px',
                background: submitting ? '#94A3B8' : '#0088cc',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 4,
              }}
            >
              {submitting && (
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }}
                />
              )}
              {submitting ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
            )}

          {canSendTest && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Тестовое сообщение</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input
                value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
                placeholder="Текст тестового сообщения..."
                disabled={testSending}
                style={{ ...inputStyle, flex: '1 1 180px', minWidth: 0 }}
              />
              <button
                type="button"
                disabled={testButtonDisabled}
                onClick={() => void handleSendTestMessage()}
                title={
                  !botStatus.configured
                    ? 'Системный бот не настроен на сервере'
                    : !telegramChatId && !botStatus.hasChatId
                      ? 'Укажите Chat ID'
                      : undefined
                }
                style={{
                  padding: '9px 16px',
                  background: testButtonDisabled ? '#94A3B8' : '#0088cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: testButtonDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                }}
              >
                {testSending && (
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                )}
                {testSending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
            {testSuccess && <div style={{ fontSize: 11, color: '#10B981', marginTop: 6, fontWeight: 600 }}>{testSuccess}</div>}
            {testError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>⚠ {testError}</div>}
          </div>
          )}
          </div>
        </div>

        {/* Event toggles */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Типы событий</div>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 14px', lineHeight: 1.45 }}>
            Выберите, какие события отправлять в Telegram после сохранения настроек.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {notificationPrefs.map((pref) => {
              const value =
                pref.key === 'notifyShipmentCreated'
                  ? notifyShipmentCreated
                  : pref.key === 'notifyStatusChanged'
                    ? notifyStatusChanged
                    : notifyCheckpointAdded;
              const setValue =
                pref.key === 'notifyShipmentCreated'
                  ? setNotifyShipmentCreated
                  : pref.key === 'notifyStatusChanged'
                    ? setNotifyStatusChanged
                    : setNotifyCheckpointAdded;

              return (
                <div
                  key={pref.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '11px 0',
                    borderBottom: '1px solid #F8FAFC',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{pref.label}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{pref.desc}</div>
                  </div>
                  <Toggle on={value} disabled={submitting || !canEditSettings} onToggle={() => setValue((v) => !v)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shipments */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>
          Грузы с Telegram-уведомлениями
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#EFF6FF', color: '#3B82F6' }}>
            {tgShipments.length}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 10 }}>
          {tgShipments.map((s) => {
            const statusC: Record<string, string> = {
              planned: '#F59E0B',
              in_transit: '#3B82F6',
              delivered: '#10B981',
              delayed: '#EF4444',
              at_checkpoint: '#8B5CF6',
            };
            const statusL: Record<string, string> = {
              planned: 'Запланирован',
              in_transit: 'В пути',
              delivered: 'Доставлен',
              delayed: 'Задержка',
              at_checkpoint: 'На пункте',
            };
            return (
              <div key={s.id} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', wordBreak: 'break-word' }}>{s.trackingNumber}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${statusC[s.status]}20`, color: statusC[s.status] }}>
                    {statusL[s.status]}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{s.origin} → {s.destination}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#94A3B8', flexWrap: 'wrap', gap: 4 }}>
                  <span>{s.client?.company ?? '—'}</span>
                  <span style={{ color: '#0088cc' }}>{s.manager?.telegramId ?? '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Journal */}
      {canViewJournal && (
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Журнал уведомлений</div>
          <button
            type="button"
            disabled={journalLoading}
            onClick={() => void loadJournal()}
            style={{
              padding: '7px 14px',
              background: '#F8FAFC',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              cursor: journalLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {journalLoading && (
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: '2px solid #E2E8F0',
                  borderTopColor: '#0088cc',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }}
              />
            )}
            Обновить
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle} aria-label="Фильтр по статусу">
            {journalStatuses.map((s) => (
              <option key={s.value || 'all'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} style={selectStyle} aria-label="Фильтр по типу события">
            {journalEventTypes.map((e) => (
              <option key={e.value || 'all'} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        {journalError && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            {journalError}
          </div>
        )}

        {journalLoading && journalEntries.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: '#8B95A7', fontSize: 13 }}>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '2.5px solid #E2E8F0',
                borderTopColor: '#0088cc',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
            Загрузка журнала...
          </div>
        ) : journalEntries.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Уведомлений пока нет</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {journalEntries.map((entry) => {
              const style = statusStyles[entry.status] ?? statusStyles.skipped;
              const related = formatRelated(entry);
              const timeLabel = formatJournalTime(entry.sentAt ?? entry.createdAt);

              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    padding: '12px 0',
                    borderBottom: '1px solid #F8FAFC',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: style.dot, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: style.bg, color: style.color }}>
                        {statusLabels[entry.status] ?? entry.status}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>{eventTypeLabels[entry.eventType] ?? entry.eventType}</span>
                      {related && <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 600 }}>{related}</span>}
                    </div>
                    {entry.messagePreview && (
                      <div style={{ fontSize: 12, color: '#0F172A', lineHeight: 1.45, wordBreak: 'break-word' }}>{entry.messagePreview}</div>
                    )}
                    {entry.status === 'failed' && entry.errorMessage && (
                      <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 4 }}>{entry.errorMessage}</div>
                    )}
                    <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#94A3B8', marginTop: 6, flexWrap: 'wrap' }}>
                      <span>{timeLabel}</span>
                      {entry.telegramMessageId && (
                        <>
                          <span>·</span>
                          <span>ID сообщения: {entry.telegramMessageId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

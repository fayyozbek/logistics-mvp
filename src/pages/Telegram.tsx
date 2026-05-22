import { useEffect, useState } from 'react';
import { managers, clients, type Shipment } from '../data/mock';
import { ApiError, getTelegramSettings, getTelegramStatus, sendTelegramTestMessage, updateTelegramSettings } from '../api';
import type { TelegramEventFlags, TelegramStatus } from '../types/api';

const notifTypes = [
  { id: 'departure', label: 'Отправление груза', desc: 'Уведомление при создании и отправке', default: true },
  { id: 'checkpoint', label: 'Прохождение точки', desc: 'Груз достиг промежуточного пункта', default: true },
  { id: 'customs', label: 'Таможенное оформление', desc: 'Груз на таможне или прошёл таможню', default: true },
  { id: 'delay', label: 'Задержка', desc: 'Отклонение от планового времени', default: true },
  { id: 'delivery', label: 'Доставка', desc: 'Груз доставлен получателю', default: true },
  { id: 'payment', label: 'Финансы', desc: 'Выставление счёта и оплата', default: false },
  { id: 'docs', label: 'Документы', desc: 'Запрос или загрузка документов', default: false },
];

const settingsFieldLabels: Record<string, string> = {
  chatId: 'Chat ID',
  connected: 'Подключение',
  eventFlags: 'Типы уведомлений',
};

function formatFieldErrors(errors: Record<string, string[]>): string[] {
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((message) => {
      const label = settingsFieldLabels[field] ?? field;
      return `${label}: ${message}`;
    }),
  );
}

const mockLogs = [
  { id: 1, time: '19 мая, 15:42', shipment: 'LGX-2026-0498', type: 'checkpoint', text: '✈ Груз прибыл в аэропорт Стамбул (IST). Транзит.', manager: 'Дина Сейткали', status: 'sent' },
  { id: 2, time: '19 мая, 14:10', shipment: 'LGX-2026-0512', type: 'delay', text: '⚠️ Задержка! LGX-2026-0387 ожидает документов в Актобе.', manager: 'Алексей Морозов', status: 'sent' },
  { id: 3, time: '18 мая, 10:05', shipment: 'LGX-2026-0533', type: 'delivery', text: '✅ Груз LGX-2026-0533 доставлен! Алматы, станция Алматы-1.', manager: 'Анна Белова', status: 'sent' },
  { id: 4, time: '17 мая, 08:30', shipment: 'LGX-2026-0421', type: 'payment', text: '💳 Счёт INV-2026-001 оплачен клиентом KazExport LLP.', manager: 'Алексей Морозов', status: 'failed' },
  { id: 5, time: '16 мая, 22:00', shipment: 'LGX-2026-0561', type: 'departure', text: '🛫 Новый груз LGX-2026-0561 создан. Алматы → Дубай.', manager: 'Дина Сейткали', status: 'sent' },
];

function buildEventFlags(toggles: Record<string, boolean>): TelegramEventFlags {
  return Object.fromEntries(
    notifTypes.map((type) => [type.id, toggles[type.id] ?? type.default]),
  ) as TelegramEventFlags;
}

const defaultBotStatus: TelegramStatus = {
  configured: false,
  enabled: false,
  hasChatId: false,
  notificationsEnabled: false,
  botTokenSource: null,
};

export default function Telegram() {
  const [loading, setLoading] = useState(true);
  const [tgShipments, setTgShipments] = useState<Shipment[]>([]);
  const [chatId, setChatId] = useState('');
  const [connected, setConnected] = useState(true);
  const [toggles, setToggles] = useState(
    Object.fromEntries(notifTypes.map(n => [n.id, n.default]))
  );
  const [testMsg, setTestMsg] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState('');
  const [testError, setTestError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [settingsErrors, setSettingsErrors] = useState<string[]>([]);
  const [botStatus, setBotStatus] = useState<TelegramStatus>(defaultBotStatus);

  useEffect(() => {
    void Promise.all([
      getTelegramSettings().then(({ settings, shipments: ships }) => {
        setTgShipments(ships);
        if (settings) {
          if (settings.chatId) setChatId(settings.chatId);
          setConnected(settings.connected);
          const flags = settings.eventFlags as Record<string, boolean | undefined>;
          if (flags && Object.keys(flags).length > 0) {
            setToggles(prev => ({
              ...prev,
              ...Object.fromEntries(
                Object.entries(flags).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v as boolean])
              ),
            }));
          }
        }
      }),
      getTelegramStatus().then(setBotStatus),
    ]).finally(() => setLoading(false));
  }, []);

  const buildPayload = (overrides?: {
    connected?: boolean;
    chatId?: string;
    toggles?: Record<string, boolean>;
  }) => ({
    chatId: overrides?.chatId ?? chatId,
    connected: overrides?.connected ?? connected,
    eventFlags: buildEventFlags(overrides?.toggles ?? toggles),
  });

  const applySettingsResponse = (settings: { chatId: string | null; connected: boolean; eventFlags: TelegramEventFlags }) => {
    if (settings.chatId) setChatId(settings.chatId);
    setConnected(settings.connected);
    const flags = settings.eventFlags as Record<string, boolean | undefined>;
    if (flags && Object.keys(flags).length > 0) {
      setToggles(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(flags).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v as boolean])
        ),
      }));
    }
  };

  const handleSaveSettings = async (overrides?: Parameters<typeof buildPayload>[0]) => {
    setSubmitting(true);
    setSettingsErrors([]);
    setSuccessMessage('');

    try {
      const { settings } = await updateTelegramSettings(buildPayload(overrides));
      applySettingsResponse(settings);
      setSuccessMessage('Настройки Telegram сохранены');
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

  const handleToggleConnection = () => {
    const nextConnected = !connected;
    setConnected(nextConnected);
    void handleSaveSettings({ connected: nextConnected });
  };

  const handleSendTestMessage = async () => {
    setTestSending(true);
    setTestSuccess('');
    setTestError('');
    try {
      await sendTelegramTestMessage({
        chatId: chatId || undefined,
        message: testMsg || undefined,
      });
      setTestSuccess('✓ Сообщение успешно отправлено в Telegram');
      setTestMsg('');
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.message.toLowerCase();
        if (msg.includes('token')) {
          setTestError('Токен Telegram не настроен. Установите TELEGRAM_BOT_TOKEN на сервере.');
        } else if (msg.includes('chat id') || msg.includes('chat_id')) {
          setTestError('Укажите Chat ID в поле выше и сохраните настройки.');
        } else if (error.status === 502) {
          setTestError('Не удалось доставить сообщение через Telegram. Проверьте токен и Chat ID.');
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
    testSending || submitting || !botStatus.configured || (!chatId && !botStatus.hasChatId);

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 10, color: '#8B95A7', fontSize: 14, fontWeight: 700 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2.5px solid #E2E8F0', borderTopColor: '#0088cc',
          animation: 'spin 0.7s linear infinite',
        }} />
        Загрузка...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {successMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#15803D',
          fontSize: 13,
          fontWeight: 700,
        }}>
          {successMessage}
        </div>
      )}

      {settingsErrors.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {settingsErrors.map((error) => <div key={error}>{error}</div>)}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Bot Config */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#0088cc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✈</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Telegram Bot</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>@LogistixNotifyBot</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: connected ? '#F0FDF4' : '#FEF2F2', color: connected ? '#10B981' : '#EF4444' }}>
                {connected ? '● Подключён' : '○ Отключён'}
              </span>
            </div>
          </div>

          {/* Token status row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            padding: '8px 12px', borderRadius: 8,
            background: botStatus.configured ? '#F0FDF4' : '#FFF7ED',
            border: `1px solid ${botStatus.configured ? '#BBF7D0' : '#FED7AA'}`,
          }}>
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Токен:</span>
            {botStatus.configured ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>
                ● Настроен{botStatus.botTokenSource === 'env' ? ' (env)' : ''}
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706' }}>
                ○ Не задан — установите TELEGRAM_BOT_TOKEN на сервере
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Chat ID / Group ID</div>
              <input
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="-100xxxxxxxxxxxxx"
                disabled={submitting}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, fontFamily: 'monospace', color: '#0F172A', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>Укажите ID чата, группы или канала для уведомлений</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                disabled={submitting}
                onClick={handleToggleConnection}
                style={{ flex: 1, padding: '9px', background: connected ? '#FEF2F2' : '#3B82F6', color: connected ? '#EF4444' : '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {connected ? 'Отключить бота' : 'Подключить бота'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSaveSettings()}
                style={{
                  flex: 1,
                  padding: '9px',
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
                }}
              >
                {submitting && (
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite', display: 'inline-block',
                  }} />
                )}
                {submitting ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>
          </div>

          {/* Test message */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Тестовое сообщение</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                placeholder="Введите текст тестового сообщения..."
                disabled={testSending}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
              />
              <button
                type="button"
                disabled={testButtonDisabled}
                onClick={() => void handleSendTestMessage()}
                title={
                  !botStatus.configured
                    ? 'Токен не настроен на сервере'
                    : !chatId && !botStatus.hasChatId
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
                }}>
                {testSending && (
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite', display: 'inline-block',
                  }} />
                )}
                {testSending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
            {testSuccess && (
              <div style={{ fontSize: 11, color: '#10B981', marginTop: 6, fontWeight: 600 }}>{testSuccess}</div>
            )}
            {testError && (
              <div style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>⚠ {testError}</div>
            )}
            {!botStatus.configured && (
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>
                Для отправки настройте TELEGRAM_BOT_TOKEN в переменных среды сервера.
              </div>
            )}
          </div>
        </div>

        {/* Notification types */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Типы уведомлений</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {notifTypes.map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #F8FAFC' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{n.label}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{n.desc}</div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    const nextToggles = { ...toggles, [n.id]: !toggles[n.id] };
                    setToggles(nextToggles);
                    void handleSaveSettings({ toggles: nextToggles });
                  }}
                  style={{
                    width: 42, height: 22, borderRadius: 12, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                    background: toggles[n.id] ? '#3B82F6' : '#E2E8F0',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, transition: 'left 0.2s',
                    left: toggles[n.id] ? 23 : 3,
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shipments with TG enabled */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>
          Грузы с Telegram-уведомлениями
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#EFF6FF', color: '#3B82F6' }}>{tgShipments.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
          {tgShipments.map(s => {
            const client = clients.find(c => c.id === s.clientId);
            const manager = managers.find(m => m.id === s.managerId);
            const statusC: Record<string, string> = { planned: '#F59E0B', in_transit: '#3B82F6', delivered: '#10B981', delayed: '#EF4444', at_checkpoint: '#8B5CF6' };
            const statusL: Record<string, string> = { planned: 'Запланирован', in_transit: 'В пути', delivered: 'Доставлен', delayed: 'Задержка', at_checkpoint: 'На пункте' };
            return (
              <div key={s.id} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{s.trackingNumber}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: statusC[s.status] + '20', color: statusC[s.status] }}>{statusL[s.status]}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{s.origin} → {s.destination}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#94A3B8' }}>
                  <span>{client?.company}</span>
                  <span style={{ color: '#0088cc' }}>{manager?.telegramId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Журнал уведомлений</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {mockLogs.map(log => (
            <div key={log.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid #F8FAFC' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: log.status === 'sent' ? '#10B981' : '#EF4444', marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, color: '#0F172A' }}>{log.text}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#94A3B8' }}>
                  <span>{log.time}</span>
                  <span>·</span>
                  <span>{log.shipment}</span>
                  <span>·</span>
                  <span>{log.manager}</span>
                  <span>·</span>
                  <span style={{ color: log.status === 'sent' ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                    {log.status === 'sent' ? 'Доставлено' : 'Ошибка доставки'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { shipments, managers, clients } from '../data/mock';

const notifTypes = [
  { id: 'departure', label: 'Отправление груза', desc: 'Уведомление при создании и отправке', default: true },
  { id: 'checkpoint', label: 'Прохождение точки', desc: 'Груз достиг промежуточного пункта', default: true },
  { id: 'customs', label: 'Таможенное оформление', desc: 'Груз на таможне или прошёл таможню', default: true },
  { id: 'delay', label: 'Задержка', desc: 'Отклонение от планового времени', default: true },
  { id: 'delivery', label: 'Доставка', desc: 'Груз доставлен получателю', default: true },
  { id: 'payment', label: 'Финансы', desc: 'Выставление счёта и оплата', default: false },
  { id: 'docs', label: 'Документы', desc: 'Запрос или загрузка документов', default: false },
];

const mockLogs = [
  { id: 1, time: '19 мая, 15:42', shipment: 'LGX-2026-0498', type: 'checkpoint', text: '✈ Груз прибыл в аэропорт Стамбул (IST). Транзит.', manager: 'Дина Сейткали', status: 'sent' },
  { id: 2, time: '19 мая, 14:10', shipment: 'LGX-2026-0512', type: 'delay', text: '⚠️ Задержка! LGX-2026-0387 ожидает документов в Актобе.', manager: 'Алексей Морозов', status: 'sent' },
  { id: 3, time: '18 мая, 10:05', shipment: 'LGX-2026-0533', type: 'delivery', text: '✅ Груз LGX-2026-0533 доставлен! Алматы, станция Алматы-1.', manager: 'Анна Белова', status: 'sent' },
  { id: 4, time: '17 мая, 08:30', shipment: 'LGX-2026-0421', type: 'payment', text: '💳 Счёт INV-2026-001 оплачен клиентом KazExport LLP.', manager: 'Алексей Морозов', status: 'failed' },
  { id: 5, time: '16 мая, 22:00', shipment: 'LGX-2026-0561', type: 'departure', text: '🛫 Новый груз LGX-2026-0561 создан. Алматы → Дубай.', manager: 'Дина Сейткали', status: 'sent' },
];

export default function Telegram() {
  const [token, setToken] = useState('7321058940:AAHxyz_DEMO_TOKEN_logistix_bot');
  const [chatId, setChatId] = useState('-1001234567890');
  const [connected, setConnected] = useState(true);
  const [toggles, setToggles] = useState(
    Object.fromEntries(notifTypes.map(n => [n.id, n.default]))
  );
  const [testMsg, setTestMsg] = useState('');
  const [testSent, setTestSent] = useState(false);

  const tgShipments = shipments.filter(s => s.telegramNotifications);

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Bot Config */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Bot Token</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, fontFamily: 'monospace', color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
                />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Chat ID / Group ID</div>
              <input
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="-100xxxxxxxxxxxxx"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, fontFamily: 'monospace', color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
              />
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>Укажите ID чата, группы или канала для уведомлений</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => setConnected(!connected)}
                style={{ flex: 1, padding: '9px', background: connected ? '#FEF2F2' : '#3B82F6', color: connected ? '#EF4444' : '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                {connected ? 'Отключить бота' : 'Подключить бота'}
              </button>
              <button style={{ flex: 1, padding: '9px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Проверить соединение
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
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
              />
              <button
                onClick={() => { setTestSent(true); setTimeout(() => setTestSent(false), 3000); }}
                style={{ padding: '9px 16px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Отправить
              </button>
            </div>
            {testSent && <div style={{ fontSize: 11, color: '#10B981', marginTop: 6 }}>✓ Сообщение отправлено в Telegram</div>}
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
                  onClick={() => setToggles(prev => ({ ...prev, [n.id]: !prev[n.id] }))}
                  style={{
                    width: 42, height: 22, borderRadius: 12, border: 'none', cursor: 'pointer',
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

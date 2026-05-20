import { useState } from 'react';
import { financeRecords, clients } from '../data/mock';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const statusConfig = {
  paid: { label: 'Оплачен', color: '#10B981', bg: '#F0FDF4' },
  partial: { label: 'Частично', color: '#F59E0B', bg: '#FFFBEB' },
  unpaid: { label: 'Не оплачен', color: '#94A3B8', bg: '#F8FAFC' },
  overdue: { label: 'Просрочен', color: '#EF4444', bg: '#FEF2F2' },
};

export default function Finance() {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const totalRevenue = financeRecords.reduce((s, f) => s + f.totalAmount, 0);
  const totalPaid = financeRecords.reduce((s, f) => s + f.paidAmount, 0);
  const totalDebt = totalRevenue - totalPaid;
  const overdueCount = financeRecords.filter(f => f.status === 'overdue').length;

  const filtered = financeRecords.filter(f => filter === 'all' || f.status === filter);

  const clientData = clients.map(c => {
    const recs = financeRecords.filter(f => f.clientId === c.id);
    return {
      name: c.company.split(' ')[0],
      total: recs.reduce((s, f) => s + f.totalAmount, 0),
      paid: recs.reduce((s, f) => s + f.paidAmount, 0),
    };
  }).filter(c => c.total > 0);

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Выставлено счетов', value: `$${totalRevenue.toLocaleString()}`, sub: `${financeRecords.length} счетов`, color: '#3B82F6' },
          { label: 'Оплачено', value: `$${totalPaid.toLocaleString()}`, sub: `${Math.round(totalPaid / totalRevenue * 100)}% от выставленного`, color: '#10B981' },
          { label: 'Задолженность', value: `$${totalDebt.toLocaleString()}`, sub: 'Ожидает оплаты', color: '#F59E0B' },
          { label: 'Просроченных', value: overdueCount, sub: 'Счетов просрочено', color: '#EF4444' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: kpi.color, marginTop: 6 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Счета и платежи</div>
            <div style={{ display: 'flex', gap: 4, background: '#F8FAFC', borderRadius: 8, padding: 3, border: '1px solid #E2E8F0' }}>
              {[['all', 'Все'], ['paid', 'Оплачен'], ['partial', 'Частично'], ['unpaid', 'Не оплачен'], ['overdue', 'Просрочен']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    background: filter === v ? '#3B82F6' : 'transparent',
                    color: filter === v ? '#fff' : '#64748B',
                  }}>{l}</button>
              ))}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                {['Счёт', 'Клиент', 'Груз', 'Сумма', 'Оплачено', 'Долг', 'Срок оплаты', 'Статус'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#94A3B8', fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const client = clients.find(c => c.id === f.clientId);
                const s = statusConfig[f.status];
                const debt = f.totalAmount - f.paidAmount;
                return (
                  <>
                    <tr
                      key={f.id}
                      onClick={() => setSelected(selected === f.id ? null : f.id)}
                      style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', background: selected === f.id ? '#F8FAFC' : 'transparent' }}
                    >
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', fontSize: 11 }}>INV-{f.id.replace('f', '2026-00')}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{client?.company}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8' }}>{client?.contact}</div>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#64748B', fontSize: 11 }}>{f.shipmentId.replace('s', 'LGX-0')}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: '#0F172A' }}>${f.totalAmount.toLocaleString()}</td>
                      <td style={{ padding: '10px 10px', color: '#10B981', fontWeight: 600 }}>${f.paidAmount.toLocaleString()}</td>
                      <td style={{ padding: '10px 10px', color: debt > 0 ? '#EF4444' : '#94A3B8', fontWeight: debt > 0 ? 700 : 400 }}>
                        {debt > 0 ? `$${debt.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#94A3B8', fontSize: 11 }}>{f.dueDate}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                      </td>
                    </tr>
                    {selected === f.id && (
                      <tr key={`${f.id}-detail`} style={{ background: '#F8FAFC' }}>
                        <td colSpan={8} style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', gap: 20 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Состав счёта</div>
                              {f.items.map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, color: '#64748B' }}>{item.label}</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>${item.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                            <div style={{ width: 1, background: '#E2E8F0' }} />
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Прогресс оплаты</div>
                              <div style={{ width: 200, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${(f.paidAmount / f.totalAmount) * 100}%`, height: '100%', background: s.color, borderRadius: 3 }} />
                              </div>
                              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                                {Math.round(f.paidAmount / f.totalAmount * 100)}% оплачено · ${(f.totalAmount - f.paidAmount).toLocaleString()} остаток
                              </div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                              <button style={{ padding: '6px 14px', background: '#F0FDF4', color: '#10B981', border: '1px solid #D1FAE5', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                Отметить оплаченным
                              </button>
                              <button style={{ padding: '6px 14px', background: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                Скачать PDF
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0', alignSelf: 'flex-start' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Долг по клиентам</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 16 }}>Выставлено vs Оплачено</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clientData} barGap={3} barSize={16} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v) => `$${Number(v ?? 0).toLocaleString()}`} />
              <Bar dataKey="total" fill="#BFDBFE" radius={[0, 3, 3, 0]} name="Выставлено" />
              <Bar dataKey="paid" fill="#3B82F6" radius={[0, 3, 3, 0]} name="Оплачено" />
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Клиенты с долгом</div>
            {financeRecords.filter(f => f.status === 'overdue' || f.status === 'partial').map(f => {
              const client = clients.find(c => c.id === f.clientId);
              const debt = f.totalAmount - f.paidAmount;
              const s = statusConfig[f.status];
              return (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{client?.company}</div>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#EF4444' }}>−${debt.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

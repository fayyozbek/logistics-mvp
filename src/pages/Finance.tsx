import { Fragment, useEffect, useState } from 'react';
import { type Client, type FinanceRecord } from '../data/mock';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ApiError, exportFinanceCsv, getFinance, getFinanceReport, updateFinanceStatus } from '../api';
import type { FinanceReportSummary } from '../types/api';
import { buildFinanceReport, formatReportMonthLabel } from '../utils/financeReport';

const statusConfig = {
  paid: { label: 'Оплачен', color: '#10B981', bg: '#F0FDF4' },
  partial: { label: 'Частично', color: '#F59E0B', bg: '#FFFBEB' },
  unpaid: { label: 'Не оплачен', color: '#94A3B8', bg: '#F8FAFC' },
  overdue: { label: 'Просрочен', color: '#EF4444', bg: '#FEF2F2' },
};

const statusFieldLabels: Record<string, string> = {
  status: 'Статус',
};

function formatFieldErrors(errors: Record<string, string[]>): string[] {
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((message) => {
      const label = statusFieldLabels[field] ?? field;
      return `${label}: ${message}`;
    }),
  );
}

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [statusErrors, setStatusErrors] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [report, setReport] = useState<FinanceReportSummary | null>(null);

  useEffect(() => {
    Promise.all([getFinance(), getFinanceReport()])
      .then(([finance, financeReport]) => {
        setFinanceRecords(finance.financeRecords);
        setClients(finance.clients);
        setReport(financeReport.report);
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = report ?? buildFinanceReport(financeRecords);
  const totalRevenue = summary.totalAmount;
  const totalPaid = summary.paidAmount;
  const totalDebt = summary.outstandingAmount;
  const overdueAmount = summary.overdueAmount;
  const overdueCount = summary.countByStatus.overdue;
  const paidPercent = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;
  const revenueChartData = summary.revenueByMonth.map((row) => ({
    ...row,
    label: formatReportMonthLabel(row.month),
  }));

  const filtered = financeRecords.filter(f => filter === 'all' || f.status === filter);

  const clientData = clients.map(c => {
    const recs = financeRecords.filter(f => f.clientId === c.id);
    return {
      name: c.company.split(' ')[0],
      total: recs.reduce((s, f) => s + f.totalAmount, 0),
      paid: recs.reduce((s, f) => s + f.paidAmount, 0),
    };
  }).filter(c => c.total > 0);

  const applyFinanceRecordUpdate = (updated: FinanceRecord) => {
    setFinanceRecords((records) => {
      const next = records.map((record) => (record.id === updated.id ? updated : record));
      setReport(buildFinanceReport(next));
      return next;
    });
  };

  const refreshReport = () => {
    getFinanceReport()
      .then(({ report: nextReport }) => setReport(nextReport))
      .catch(() => {
        setFinanceRecords((records) => {
          setReport(buildFinanceReport(records));
          return records;
        });
      });
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setExportError('');
    try {
      await exportFinanceCsv();
    } catch (error) {
      setExportError(
        error instanceof ApiError
          ? error.message
          : 'Не удалось экспортировать финансы. Проверьте подключение к API.',
      );
    } finally {
      setExporting(false);
    }
  };

  const handleStatusUpdate = async (recordId: string, status: FinanceRecord['status']) => {
    setUpdatingId(recordId);
    setStatusErrors([]);
    setSuccessMessage('');

    try {
      const { financeRecord } = await updateFinanceStatus(recordId, { status });
      applyFinanceRecordUpdate(financeRecord);
      refreshReport();
      setSuccessMessage(`Статус счёта обновлён: ${statusConfig[financeRecord.status].label}`);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        setStatusErrors(formatFieldErrors(error.validationErrors));
      } else if (error instanceof ApiError) {
        setStatusErrors([error.message]);
      } else {
        setStatusErrors(['Не удалось обновить статус. Проверьте подключение к API.']);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 10, color: '#8B95A7', fontSize: 14, fontWeight: 700 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2.5px solid #E2E8F0', borderTopColor: '#3B82F6',
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

      {(statusErrors.length > 0 || exportError) && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {exportError && <div>{exportError}</div>}
          {statusErrors.map((error) => <div key={error}>{error}</div>)}
        </div>
      )}

      {/* Report summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Выставлено', value: `$${totalRevenue.toLocaleString()}`, sub: `${financeRecords.length} счетов`, color: '#3B82F6' },
          { label: 'Оплачено', value: `$${totalPaid.toLocaleString()}`, sub: `${paidPercent}% от выставленного`, color: '#10B981' },
          { label: 'Задолженность', value: `$${totalDebt.toLocaleString()}`, sub: 'Ожидает оплаты', color: '#F59E0B' },
          { label: 'Просрочено', value: `$${overdueAmount.toLocaleString()}`, sub: `${overdueCount} счетов`, color: '#EF4444' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: kpi.color, marginTop: 6 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Счета по статусу</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(statusConfig) as FinanceRecord['status'][]).map((status) => {
              const cfg = statusConfig[status];
              const count = summary.countByStatus[status] ?? 0;
              return (
                <div
                  key={status}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}22`,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Выручка по месяцам</div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 12 }}>Выставлено vs оплачено</div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={revenueChartData} barGap={4} barSize={14}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Number(v) / 1000}k`} width={42} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v) => `$${Number(v ?? 0).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#BFDBFE" radius={[3, 3, 0, 0]} name="Выставлено" />
                <Bar dataKey="paid" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Оплачено" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Нет данных по месяцам</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Счета и платежи</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exporting}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                background: '#fff',
                color: '#334155',
                fontSize: 11,
                fontWeight: 600,
                cursor: exporting ? 'not-allowed' : 'pointer',
                opacity: exporting ? 0.7 : 1,
              }}
            >
              {exporting ? 'Экспорт...' : 'Экспорт финансов'}
            </button>
            <div style={{ display: 'flex', gap: 4, background: '#F8FAFC', borderRadius: 8, padding: 3, border: '1px solid #E2E8F0' }}>
              {[['all', 'Все'], ['paid', 'Оплачен'], ['partial', 'Частично'], ['unpaid', 'Не оплачен'], ['overdue', 'Просрочен']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setFilter(v)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    background: filter === v ? '#3B82F6' : 'transparent',
                    color: filter === v ? '#fff' : '#64748B',
                  }}>{l}</button>
              ))}
            </div>
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
                const isUpdating = updatingId === f.id;
                return (
                  <Fragment key={f.id}>
                    <tr
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
                          <div style={{ display: 'flex', gap: 20 }} onClick={(event) => event.stopPropagation()}>
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
                              <div style={{ marginTop: 10 }}>
                                <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 4 }}>Статус счёта</div>
                                <select
                                  value={f.status}
                                  disabled={isUpdating}
                                  onChange={(event) => void handleStatusUpdate(f.id, event.target.value as FinanceRecord['status'])}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 8,
                                    border: '1px solid #E2E8F0',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: '#fff',
                                    color: '#0F172A',
                                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {(Object.keys(statusConfig) as FinanceRecord['status'][]).map((status) => (
                                    <option key={status} value={status}>{statusConfig[status].label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              {f.status !== 'paid' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => void handleStatusUpdate(f.id, 'paid')}
                                  style={{
                                    padding: '6px 14px',
                                    background: '#F0FDF4',
                                    color: '#10B981',
                                    border: '1px solid #D1FAE5',
                                    borderRadius: 7,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  {isUpdating && (
                                    <span style={{
                                      width: 12, height: 12, borderRadius: '50%',
                                      border: '2px solid rgba(16,185,129,0.3)', borderTopColor: '#10B981',
                                      animation: 'spin 0.7s linear infinite', display: 'inline-block',
                                    }} />
                                  )}
                                  {isUpdating ? 'Сохранение...' : 'Отметить оплаченным'}
                                </button>
                              )}
                              <button type="button" disabled title="Формирование PDF-документов будет доступно в следующей версии" style={{ padding: '6px 14px', background: '#F8FAFC', color: '#94A3B8', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>
                                Скачать PDF
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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

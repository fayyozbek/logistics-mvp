import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, ChevronDown, PackageCheck, TrendingUp } from 'lucide-react';
import { getDashboardData, handleApiLoadFailure } from '../api';
import ApiLoadErrorPanel from '../components/ApiLoadErrorPanel';
import PageLoading from '../components/PageLoading';
import type { DashboardData } from '../types/api';

// Fallback chart data shown while the API response is in flight.
const moneyByMonthFallback = [
  { month: 'Янв', turnover: 128000, paid: 94000, shipments: 42, active: 8 },
  { month: 'Фев', turnover: 156000, paid: 118000, shipments: 50, active: 10 },
  { month: 'Мар', turnover: 184000, paid: 139000, shipments: 58, active: 12 },
  { month: 'Апр', turnover: 212000, paid: 166000, shipments: 64, active: 14 },
  { month: 'Май', turnover: 248000, paid: 191000, shipments: 72, active: 16 },
  { month: 'Июн', turnover: 236000, paid: 187000, shipments: 69, active: 15 },
  { month: 'Июл', turnover: 268000, paid: 214000, shipments: 78, active: 18 },
  { month: 'Авг', turnover: 291000, paid: 238000, shipments: 82, active: 19 },
  { month: 'Сен', turnover: 317000, paid: 262000, shipments: 91, active: 22 },
];

const directionShareFallback = [
  { name: 'Китай', value: 36, color: '#0B4CB8' },
  { name: 'Турция', value: 22, color: '#2563EB' },
  { name: 'Европа', value: 18, color: '#60A5FA' },
  { name: 'СНГ', value: 14, color: '#93C5FD' },
  { name: 'ОАЭ', value: 10, color: '#CBD5E1' },
];

const popularDirections = [
  { name: 'Китай → Казахстан', value: 45, color: '#0B4CB8', amount: '$142.8k' },
  { name: 'Турция → Казахстан', value: 32, color: '#2563EB', amount: '$120.5k' },
  { name: 'Европа → Алматы', value: 26, color: '#60A5FA', amount: '$87.3k' },
  { name: 'СНГ → Алматы', value: 19, color: '#93C5FD', amount: '$56.8k' },
  { name: 'ОАЭ → Алматы', value: 12, color: '#CBD5E1', amount: '$41.2k' },
];

const managerDelays = [
  { name: 'Дина Сейткали', days: 2.1, color: '#93C5FD', tag: 'Отлично' },
  { name: 'Анна Белова', days: 3.8, color: '#60A5FA', tag: 'Норма' },
  { name: 'Алексей Морозов', days: 5.4, color: '#3B82F6', tag: 'Норма' },
  { name: 'Рустам Нуров', days: 7.2, color: '#2563EB', tag: 'Долго' },
  { name: 'Марлен Ким', days: 9.6, color: '#1D4ED8', tag: 'Критично' },
];

const calendarEvents = [
  { day: 3, label: 'Оплата KazExport', amount: '$4.8k', tone: '#DBEAFE' },
  { day: 8, label: 'Отгрузка Турция', amount: '$12.6k', tone: '#BFDBFE' },
  { day: 14, label: 'Груз Китай', amount: '$22k', tone: '#93C5FD' },
  { day: 21, label: 'Платёж EuroCargo', amount: '$9.4k', tone: '#60A5FA' },
  { day: 27, label: 'Новый маршрут ОАЭ', amount: '$5.1k', tone: '#CBD5E1' },
];

type ChartPeriod = 'Неделя' | 'Месяц' | 'Год';

const CHART_PERIOD_API: Record<ChartPeriod, 'week' | 'month' | 'year'> = {
  Неделя: 'week',
  Месяц: 'month',
  Год: 'year',
};

const CALENDAR_MONTHS = [
  { value: '2026-04', label: 'Апрель 2026' },
  { value: '2026-05', label: 'Май 2026' },
];

function daysInMonth(monthValue: string): number {
  const [year, month] = monthValue.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function formatDateLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${Math.round(value / 1000)}k`;
}

function StatCard({
  title,
  value,
  note,
  bg,
  color,
  dark,
}: {
  title: string;
  value: string;
  note: string;
  bg: string;
  color: string;
  dark?: boolean;
}) {
  return (
    <div style={{
      background: dark ? '#0B4CB8' : bg,
      borderRadius: 22,
      padding: '20px 22px',
      minHeight: 98,
      color: dark ? '#fff' : '#111827',
      border: '1px solid rgba(255,255,255,0.75)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.8)' : '#64748B', fontWeight: 800 }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: -0.9 }}>{value}</div>
        <div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.78)' : color, fontWeight: 800 }}>{note}</div>
      </div>
    </div>
  );
}

function CalendarPopover({
  onClose,
  onApply,
  calendarMonth,
  onMonthChange,
  dateFrom,
  dateTo,
  onPickDate,
  onClear,
}: {
  onClose: () => void;
  onApply: () => void;
  calendarMonth: string;
  onMonthChange: (month: string) => void;
  dateFrom: string | null;
  dateTo: string | null;
  onPickDate: (isoDate: string) => void;
  onClear: () => void;
}) {
  const days = Array.from({ length: daysInMonth(calendarMonth) }, (_, index) => index + 1);

  const isInRange = (isoDate: string) => {
    if (!dateFrom || !dateTo) return false;
    const start = dateFrom <= dateTo ? dateFrom : dateTo;
    const end = dateFrom <= dateTo ? dateTo : dateFrom;
    return isoDate >= start && isoDate <= end;
  };

  return (
    <div style={{
      position: 'absolute',
      top: 46,
      right: 0,
      width: 430,
      maxWidth: 'calc(100vw - 24px)',
      background: '#fff',
      borderRadius: 22,
      border: '1px solid #E2E8F0',
      padding: 22,
      zIndex: 20,
      boxShadow: '0 18px 60px rgba(15,23,42,0.16)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={calendarMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px 10px', fontSize: 13, fontWeight: 800, color: '#0F172A', background: '#fff' }}
            >
              {CALENDAR_MONTHS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
            {dateFrom && dateTo
              ? `Период: ${formatDateLabel(dateFrom)} — ${formatDateLabel(dateTo)}`
              : dateFrom
                ? `Выберите дату окончания после ${formatDateLabel(dateFrom)}`
                : 'Выберите дату начала и дату окончания'}
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ border: 'none', background: '#F1F5F9', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', color: '#64748B' }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 14 }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
          <div key={day} style={{ textAlign: 'center', fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>{day}</div>
        ))}
        {days.map((day) => {
          const isoDate = `${calendarMonth}-${String(day).padStart(2, '0')}`;
          const event = calendarEvents.find((item) => item.day === day && calendarMonth === '2026-04');
          const inRange = isInRange(isoDate);
          const isEdge = isoDate === dateFrom || isoDate === dateTo;
          return (
            <button key={day} type="button" onClick={() => onPickDate(isoDate)} style={{
              height: 36,
              borderRadius: 11,
              border: 'none',
              background: isEdge ? '#0B4CB8' : event ? event.tone : inRange ? '#DDEBFF' : '#F8FAFC',
              color: isEdge ? '#fff' : event ? '#0F172A' : inRange ? '#3158D4' : '#94A3B8',
              fontSize: 12,
              fontWeight: isEdge || event ? 900 : 700,
              cursor: 'pointer',
              position: 'relative',
            }}>
              {day}
              {event && <span style={{ position: 'absolute', bottom: 4, left: '50%', width: 4, height: 4, borderRadius: '50%', background: '#fff', transform: 'translateX(-50%)' }} />}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {calendarEvents.slice(0, 3).map((event) => (
          <div key={event.day} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', borderRadius: 12, padding: '9px 10px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: event.tone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>{event.day}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{event.label}</div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>событие периода</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#0F172A' }}>{event.amount}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
        <button type="button" onClick={onClear} style={{ flex: 1, border: '1px solid #E2E8F0', background: '#fff', borderRadius: 12, padding: '10px 12px', color: '#64748B', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          Сбросить
        </button>
        <button type="button" onClick={onApply} style={{ flex: 1, border: 'none', background: '#0B4CB8', borderRadius: 12, padding: '10px 12px', color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          Применить
        </button>
      </div>
    </div>
  );
}

function PeriodTabs({ value, onChange }: { value: ChartPeriod; onChange: (value: ChartPeriod) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, background: '#F3F5FC', borderRadius: 12, padding: 4 }}>
      {(['Неделя', 'Месяц', 'Год'] as ChartPeriod[]).map((item) => {
        const active = item === value;
        return (
          <button
            key={item}
            onClick={() => onChange(item)}
            style={{
              padding: '6px 13px',
              borderRadius: 9,
              border: 'none',
              background: active ? '#0B4CB8' : 'transparent',
              color: active ? '#fff' : '#8B95A7',
              fontSize: 11,
              fontWeight: 900,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('Месяц');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [draftFrom, setDraftFrom] = useState<string | null>(null);
  const [draftTo, setDraftTo] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState('2026-04');

  const loadDashboard = useCallback(() => {
    setLoading(true);
    getDashboardData({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      chartPeriod: CHART_PERIOD_API[chartPeriod],
    })
      .then((data) => {
        setDashboardData(data);
        setLoadError(null);
      })
      .catch((error) => {
        setDashboardData(null);
        setLoadError(handleApiLoadFailure(error).message);
      })
      .finally(() => setLoading(false));
  }, [chartPeriod, dateFrom, dateTo]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = dashboardData?.summary;
  const monthlyTurnover = summary?.monthlyTurnover ?? 0;
  const totalPaid = summary?.totalPaid ?? 0;
  const activeShipments = summary?.activeShipments ?? 0;
  const completedShipments = summary?.completedShipments ?? 0;
  const receivable = summary?.receivable ?? 0;

  const chartData = dashboardData?.charts.moneyByMonth ?? moneyByMonthFallback;
  const directionShare = dashboardData?.charts.directionShare ?? directionShareFallback;
  const isEmpty = !loading && monthlyTurnover === 0 && chartData.length === 0;

  const selectedPeriod = useMemo(() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} — ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `${formatDateLabel(dateFrom)} — выберите конец`;
    return 'Весь период';
  }, [dateFrom, dateTo]);

  const handlePickDate = (isoDate: string) => {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(isoDate);
      setDraftTo(null);
      return;
    }
    if (isoDate < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(isoDate);
      return;
    }
    setDraftTo(isoDate);
  };

  const openCalendar = () => {
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
    setCalendarOpen(true);
  };

  const applyDateFilter = () => {
    setDateFrom(draftFrom);
    setDateTo(draftTo);
    setCalendarOpen(false);
  };

  const clearDateFilter = () => {
    setDraftFrom(null);
    setDraftTo(null);
    setDateFrom(null);
    setDateTo(null);
  };

  if (loadError && !loading) {
    return <ApiLoadErrorPanel message={loadError} />;
  }

  if (loading) {
    return <PageLoading padding="22px 28px" accentColor="#0B4CB8" />;
  }

  return (
    <div style={{ padding: '22px 28px 28px', background: '#F5F7FB', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 950, color: '#111827', letterSpacing: -0.8 }}>Analytics</div>
          <div style={{ fontSize: 12, color: '#8B95A7', marginTop: 4 }}>Оборот, активные грузы, направления и эффективность менеджеров</div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => (calendarOpen ? setCalendarOpen(false) : openCalendar())}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: 'none',
              background: 'transparent',
              color: '#4B5563',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '8px 10px',
            }}
          >
            <CalendarDays size={18} />
            {selectedPeriod}
            <ChevronDown size={16} />
          </button>
          {calendarOpen && (
            <CalendarPopover
              onClose={() => setCalendarOpen(false)}
              onApply={applyDateFilter}
              calendarMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
              dateFrom={draftFrom}
              dateTo={draftTo}
              onPickDate={handlePickDate}
              onClear={clearDateFilter}
            />
          )}
        </div>
      </div>

      {isEmpty && (
        <div style={{
          padding: '14px 16px',
          borderRadius: 14,
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          color: '#64748B',
          fontSize: 13,
          fontWeight: 700,
        }}>
          Нет данных за выбранный период. Измените диапазон дат или нажмите «Сбросить».
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr 1fr 1fr', gap: 16 }}>
        <StatCard title="Месячный оборот" value={formatMoney(monthlyTurnover)} note="+18% к августу" bg="#DDEBFF" color="#0B4CB8" dark />
        <StatCard title="Пришло денег" value={formatMoney(totalPaid)} note={monthlyTurnover > 0 ? `${Math.round((totalPaid / monthlyTurnover) * 100)}% собрано` : '—'} bg="#EAF2FF" color="#0B4CB8" />
        <StatCard title="Активные грузы" value={`${activeShipments}`} note={activeShipments + completedShipments > 0 ? `${Math.round((activeShipments / (activeShipments + completedShipments)) * 100)}% от всех` : '—'} bg="#F8FAFC" color="#2563EB" />
        <StatCard title="Завершено" value={`${completedShipments}`} note="за период" bg="#F8FAFC" color="#334155" />
        <StatCard title="К получению" value={formatMoney(receivable)} note="по клиентам" bg="#EAF2FF" color="#1D4ED8" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <section style={{ background: '#fff', borderRadius: 22, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.8)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 950, color: '#111827' }}>Грузы по месяцам</div>
            <PeriodTabs value={chartPeriod} onChange={setChartPeriod} />
          </div>
          <ResponsiveContainer width="100%" height={235}>
            <BarChart data={chartData} barSize={chartPeriod === 'Неделя' ? 36 : 28}>
              <CartesianGrid vertical={false} stroke="#EEF2FF" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 14, border: 'none', background: '#0B4CB8', color: '#fff' }} />
              <Bar dataKey="active" stackId="a" fill="#DBEAFE" radius={[0, 0, 0, 0]} name="Активные" />
              <Bar dataKey="shipments" stackId="a" fill="#BFDBFE" radius={[0, 0, 0, 0]} name="Все грузы" />
              <Bar dataKey="active" stackId="a" fill="#2563EB" radius={[8, 8, 0, 0]} name="В пути" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Все', 'Активные', 'Доставлены', 'Задержки'].map((item, index) => (
              <span key={item} style={{ padding: '6px 10px', borderRadius: 999, background: index === 0 ? '#0B4CB8' : '#F3F5FC', color: index === 0 ? '#fff' : '#8B95A7', fontSize: 11, fontWeight: 800 }}>{item}</span>
            ))}
          </div>
        </section>

        <section style={{ background: '#fff', borderRadius: 22, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.8)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 950, color: '#111827' }}>Оборот и оплаты</div>
            <PeriodTabs value={chartPeriod} onChange={setChartPeriod} />
          </div>
          <ResponsiveContainer width="100%" height={235}>
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} stroke="#EEF2FF" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
              <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(value) => `$${Number(value).toLocaleString()}`} />
              <Line type="monotone" dataKey="turnover" stroke="#0B4CB8" strokeWidth={3} dot={false} name="Оборот" />
              <Line type="monotone" dataKey="paid" stroke="#93C5FD" strokeWidth={3} dot={false} name="Пришло денег" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Все', 'Китай', 'Турция', 'Европа', 'ОАЭ'].map((item, index) => (
              <span key={item} style={{ padding: '6px 10px', borderRadius: 999, background: index === 0 ? '#0B4CB8' : '#F3F5FC', color: index === 0 ? '#fff' : '#8B95A7', fontSize: 11, fontWeight: 800 }}>{item}</span>
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr 1fr', gap: 18 }}>
        <section style={{ background: '#fff', borderRadius: 22, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.8)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 950, color: '#111827' }}>Разделение направлений</div>
            <span style={{ fontSize: 12, color: '#111827', fontWeight: 900 }}>Все ↗</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 16, alignItems: 'center' }}>
            <div style={{ height: 190, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={directionShare} dataKey="value" innerRadius={62} outerRadius={86} paddingAngle={3} startAngle={90} endAngle={-270}>
                    {directionShare.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 950, color: '#111827', textAlign: 'center' }}>
                Все<br />направления
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {directionShare.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: 13, color: '#4B5563', fontWeight: 700 }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 950 }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: '#fff', borderRadius: 22, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 950, color: '#111827' }}>Популярные направления</div>
            <span style={{ fontSize: 12, color: '#111827', fontWeight: 900 }}>Все ↗</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {popularDirections.map((item) => (
              <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 64px', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: item.color }} />
                  <span style={{ fontSize: 12, color: '#4B5563', fontWeight: 800 }}>{item.name}</span>
                </div>
                <div style={{ height: 24, background: '#F3F5FC', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${item.value * 1.8}%`, height: '100%', background: item.color, borderRadius: 8 }} />
                </div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 950, textAlign: 'right' }}>{item.amount}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#fff', borderRadius: 22, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 950, color: '#111827' }}>Ср. задержка менеджеров</div>
            <span style={{ fontSize: 12, color: '#111827', fontWeight: 900 }}>Все ↗</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {managerDelays.map((item) => (
              <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 58px', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#4B5563', fontWeight: 800 }}>{item.name}</div>
                <div style={{ height: 22, background: '#F3F5FC', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(item.days * 10, 100)}%`, height: '100%', background: item.color, borderRadius: 8 }} />
                </div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 950, textAlign: 'right' }}>{item.days} дн.</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <span style={{ padding: '8px 13px', borderRadius: 999, background: '#EAF2FF', color: '#0B4CB8', fontSize: 11, fontWeight: 900 }}>Отлично</span>
            <span style={{ padding: '8px 13px', borderRadius: 999, background: '#DBEAFE', color: '#1D4ED8', fontSize: 11, fontWeight: 900 }}>Норма</span>
            <span style={{ padding: '8px 13px', borderRadius: 999, background: '#F1F5F9', color: '#334155', fontSize: 11, fontWeight: 900 }}>Долго</span>
          </div>
        </section>
      </div>

      <section style={{ background: '#fff', borderRadius: 22, padding: '18px 22px', border: '1px solid rgba(255,255,255,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: '#DBEAFE', color: '#0B4CB8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 950, color: '#111827' }}>Ключевые направления месяца</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Показывает, куда чаще всего идут активные B2B-грузы</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { name: 'Китай', route: 'Шанхай / Урумчи', shipments: 34, money: '$142.8k', bg: '#EAF2FF', color: '#0B4CB8' },
            { name: 'Турция', route: 'Стамбул', shipments: 21, money: '$120.5k', bg: '#F8FAFC', color: '#2563EB' },
            { name: 'Германия', route: 'Франкфурт', shipments: 17, money: '$87.3k', bg: '#F8FAFC', color: '#334155' },
            { name: 'ОАЭ', route: 'Дубай', shipments: 12, money: '$41.2k', bg: '#F0F7FF', color: '#0284C7' },
            { name: 'СНГ', route: 'Ташкент / Бишкек', shipments: 18, money: '$56.8k', bg: '#F8FAFC', color: '#64748B' },
          ].map((item) => (
            <div key={item.name} style={{ borderRadius: 16, background: item.bg, padding: '15px 16px', border: '1px solid rgba(255,255,255,0.85)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: '#111827' }}>{item.name}</div>
                <PackageCheck size={17} color={item.color} />
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{item.route}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>Грузов</div>
                  <div style={{ fontSize: 18, color: item.color, fontWeight: 950 }}>{item.shipments}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>Оборот</div>
                  <div style={{ fontSize: 18, color: '#111827', fontWeight: 950 }}>{item.money}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Archive as ArchiveIcon, CalendarDays, Eye, FileText, PackageCheck, Search, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type ArchiveStatus = 'completed' | 'paused' | 'closed';

interface ArchivedProject {
  id: string;
  partner: string;
  description: string;
  type: 'Авто' | 'Авиа' | 'Море' | 'Интермодал';
  amount: number;
  status: ArchiveStatus;
  paidAt: string;
  confirmedBy: string;
  addedAt: string;
  year: number;
  month: number;
  shipments: number;
  logs: string[];
  activity: { month: string; tasks: number; shipments: number }[];
}

const archivedProjects: ArchivedProject[] = [
  {
    id: 'AR-2026-014',
    partner: 'KazExport LLP',
    description: 'Поставка электроники Алматы → Ташкент',
    type: 'Авто',
    amount: 4800,
    status: 'completed',
    paidAt: '2026-04-16',
    confirmedBy: 'Алексей Морозов',
    addedAt: '2026-04-18',
    year: 2026,
    month: 4,
    shipments: 4,
    logs: ['Создан маршрут Алматы → Шымкент → Ташкент', 'Пройдена таможня Гишт-Купрук', 'Финансы закрыты полностью', 'Проект перенесён в архив'],
    activity: [
      { month: 'Янв', tasks: 4, shipments: 1 },
      { month: 'Фев', tasks: 8, shipments: 2 },
      { month: 'Мар', tasks: 12, shipments: 3 },
      { month: 'Апр', tasks: 18, shipments: 4 },
    ],
  },
  {
    id: 'AR-2026-021',
    partner: 'EuroCargo SA',
    description: 'Интермодальная доставка Париж → Алматы',
    type: 'Интермодал',
    amount: 9400,
    status: 'completed',
    paidAt: '2026-05-13',
    confirmedBy: 'Анна Белова',
    addedAt: '2026-05-14',
    year: 2026,
    month: 5,
    shipments: 6,
    logs: ['Партнёр подтвердил загрузку', 'Ж/Д терминал Малашевиче закрыт без задержек', 'Счёт INV-2026-005 оплачен', 'Архивация подтверждена руководителем'],
    activity: [
      { month: 'Фев', tasks: 5, shipments: 1 },
      { month: 'Мар', tasks: 9, shipments: 2 },
      { month: 'Апр', tasks: 14, shipments: 3 },
      { month: 'Май', tasks: 20, shipments: 6 },
    ],
  },
  {
    id: 'AR-2025-088',
    partner: 'Global Trade GmbH',
    description: 'Авиа-карго медицинского оборудования',
    type: 'Авиа',
    amount: 12600,
    status: 'closed',
    paidAt: '2025-11-28',
    confirmedBy: 'Дина Сейткали',
    addedAt: '2025-12-02',
    year: 2025,
    month: 12,
    shipments: 9,
    logs: ['Контракт закрыт после 9 отправлений', 'Все документы переданы партнёру', 'Финальная сверка без расхождений', 'Проект закрыт'],
    activity: [
      { month: 'Авг', tasks: 7, shipments: 2 },
      { month: 'Сен', tasks: 11, shipments: 3 },
      { month: 'Окт', tasks: 15, shipments: 4 },
      { month: 'Ноя', tasks: 21, shipments: 9 },
    ],
  },
  {
    id: 'AR-2025-102',
    partner: 'Silk Road Cargo',
    description: 'Морские поставки Шанхай → Актау',
    type: 'Море',
    amount: 22000,
    status: 'paused',
    paidAt: '2025-09-18',
    confirmedBy: 'Рустам Нуров',
    addedAt: '2025-09-20',
    year: 2025,
    month: 9,
    shipments: 5,
    logs: ['Проект остановлен из-за сезонных ставок', 'Контейнеры закрыты актами', 'Долгов нет', 'Ожидает повторного запуска'],
    activity: [
      { month: 'Июн', tasks: 6, shipments: 1 },
      { month: 'Июл', tasks: 13, shipments: 2 },
      { month: 'Авг', tasks: 16, shipments: 4 },
      { month: 'Сен', tasks: 10, shipments: 5 },
    ],
  },
];

const statusMeta: Record<ArchiveStatus, { label: string; color: string; bg: string }> = {
  completed: { label: 'Завершён', color: '#047857', bg: '#D1FAE5' },
  paused: { label: 'На паузе', color: '#B45309', bg: '#FEF3C7' },
  closed: { label: 'Закрыт', color: '#475569', bg: '#E2E8F0' },
};

export default function Archive() {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [selected, setSelected] = useState<ArchivedProject | null>(null);

  const filteredProjects = useMemo(() => archivedProjects.filter((project) => {
    const matchesQuery = !query
      || project.partner.toLowerCase().includes(query.toLowerCase())
      || project.description.toLowerCase().includes(query.toLowerCase())
      || project.id.toLowerCase().includes(query.toLowerCase());
    const matchesYear = year === 'all' || project.year === Number(year);
    const matchesMonth = month === 'all' || project.month === Number(month);
    return matchesQuery && matchesYear && matchesMonth;
  }), [month, query, year]);

  const yearlyActivity = [
    { year: '2023', projects: 18, amount: 142000 },
    { year: '2024', projects: 26, amount: 228000 },
    { year: '2025', projects: 34, amount: 341000 },
    { year: '2026', projects: 19, amount: 188000 },
  ];

  const totalAmount = filteredProjects.reduce((sum, project) => sum + project.amount, 0);

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={{ background: '#fff', border: '1px solid #EEF2FF', borderRadius: 16, padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArchiveIcon size={21} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>Архив проектов</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>
                История завершённых проектов (демо-данные). Актуальные партнёры — в разделе «Партнёры».
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Проекты', value: filteredProjects.length },
              { label: 'Сумма', value: `$${totalAmount.toLocaleString()}` },
            ].map((stat) => (
              <div key={stat.label} style={{ minWidth: 92, background: '#F8FAFC', border: '1px solid #EEF2FF', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>{stat.label}</div>
                <div style={{ fontSize: 17, color: '#0F172A', fontWeight: 900, marginTop: 4 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #EEF2FF', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>Архивные проекты</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', width: 250 }}>
                <Search size={14} color="#94A3B8" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Партнёр, проект, номер..."
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: '#0F172A', width: '100%' }}
                />
              </div>
              <select value={year} onChange={(event) => setYear(event.target.value)} style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#0F172A', outline: 'none' }}>
                <option value="all">Все годы</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
              <select value={month} onChange={(event) => setMonth(event.target.value)} style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#0F172A', outline: 'none' }}>
                <option value="all">Все месяцы</option>
                <option value="1">Январь</option>
                <option value="4">Апрель</option>
                <option value="5">Май</option>
                <option value="9">Сентябрь</option>
                <option value="12">Декабрь</option>
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Партнёр', 'Описание', 'Тип', 'Сумма', 'Статус', 'Дата оплаты', 'Подтвердил', 'Добавлен', 'Действия'].map((heading) => (
                  <th key={heading} style={{ textAlign: 'left', padding: '11px 12px', color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 900 }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const status = statusMeta[project.status];
                return (
                  <tr key={project.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '13px 12px' }}>
                      <div style={{ fontSize: 12, color: '#0F172A', fontWeight: 900 }}>{project.partner}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>{project.id}</div>
                    </td>
                    <td style={{ padding: '13px 12px', color: '#64748B', maxWidth: 220 }}>{project.description}</td>
                    <td style={{ padding: '13px 12px', color: '#334155', fontWeight: 800 }}>{project.type}</td>
                    <td style={{ padding: '13px 12px', color: '#0F172A', fontWeight: 900 }}>${project.amount.toLocaleString()}</td>
                    <td style={{ padding: '13px 12px' }}><span style={{ padding: '4px 9px', borderRadius: 999, background: status.bg, color: status.color, fontSize: 10, fontWeight: 900 }}>{status.label}</span></td>
                    <td style={{ padding: '13px 12px', color: '#64748B' }}>{project.paidAt}</td>
                    <td style={{ padding: '13px 12px', color: '#64748B' }}>{project.confirmedBy}</td>
                    <td style={{ padding: '13px 12px', color: '#64748B' }}>{project.addedAt}</td>
                    <td style={{ padding: '13px 12px' }}>
                      <button onClick={() => setSelected(project)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #EEF2FF', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CalendarDays size={16} color="#3B82F6" />
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>Активность по годам</div>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={yearlyActivity}>
                <CartesianGrid stroke="#EEF2FF" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Bar dataKey="projects" fill="#3B82F6" radius={[5, 5, 0, 0]} name="Проекты" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#fff', border: '1px solid #EEF2FF', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <PackageCheck size={16} color="#16834A" />
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>Архивные итоги</div>
            </div>
            {[
              { label: 'Закрытых грузов', value: filteredProjects.reduce((sum, project) => sum + project.shipments, 0) },
              { label: 'Завершённых проектов', value: filteredProjects.filter((project) => project.status === 'completed').length },
              { label: 'Проектов на паузе', value: filteredProjects.filter((project) => project.status === 'paused').length },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>{item.label}</span>
                <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 900 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', zIndex: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: 24 }}>
          <div style={{ width: 980, maxWidth: '96vw', background: '#fff', borderRadius: 22, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '26px 30px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 21, color: '#0F172A', fontWeight: 950, letterSpacing: -0.4 }}>{selected.partner}</div>
                <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 5 }}>{selected.id} · {selected.description}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 38, height: 38, border: 'none', borderRadius: 12, background: '#F8FAFC', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={19} /></button>
            </div>

            <div style={{ padding: '22px 30px 26px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, background: '#fff' }}>
              <div style={{ background: '#F7F8FA', borderRadius: 18, padding: 18, border: '1px solid #EEF2F7' }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: '#0F172A', marginBottom: 12 }}>График активности проекта</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={selected.activity}>
                    <CartesianGrid stroke="#EEF2FF" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Line type="monotone" dataKey="tasks" stroke="#3B82F6" strokeWidth={2.5} name="Задачи" />
                    <Line type="monotone" dataKey="shipments" stroke="#16834A" strokeWidth={2.5} name="Грузы" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: '#F7F8FA', borderRadius: 18, padding: 18, border: '1px solid #EEF2F7' }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: '#0F172A', marginBottom: 12 }}>Логи архива</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selected.logs.map((log) => (
                    <div key={log} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 8, background: '#F0FDF4', color: '#16834A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={13} /></div>
                      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.35 }}>{log}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#F8FAFC', borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase' }}>Только чтение</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Архивные проекты нельзя редактировать, только просматривать историю и активность.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

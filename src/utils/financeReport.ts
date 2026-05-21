import type { FinanceRecord } from '../data/mock';
import type { FinanceReportSummary } from '../types/api';

const STATUSES: FinanceRecord['status'][] = ['paid', 'partial', 'unpaid', 'overdue'];

export function buildFinanceReport(records: FinanceRecord[]): FinanceReportSummary {
  const totalAmount = records.reduce((sum, record) => sum + record.totalAmount, 0);
  const paidAmount = records.reduce((sum, record) => sum + record.paidAmount, 0);
  const outstandingAmount = Math.max(0, totalAmount - paidAmount);
  const overdueAmount = records
    .filter((record) => record.status === 'overdue')
    .reduce((sum, record) => sum + Math.max(0, record.totalAmount - record.paidAmount), 0);

  const countByStatus = STATUSES.reduce(
    (acc, status) => {
      acc[status] = records.filter((record) => record.status === status).length;
      return acc;
    },
    {} as FinanceReportSummary['countByStatus'],
  );

  const monthMap = new Map<string, { revenue: number; paid: number; invoiceCount: number }>();

  records.forEach((record) => {
    if (!record.invoiceDate) return;
    const month = record.invoiceDate.slice(0, 7);
    const current = monthMap.get(month) ?? { revenue: 0, paid: 0, invoiceCount: 0 };
    current.revenue += record.totalAmount;
    current.paid += record.paidAmount;
    current.invoiceCount += 1;
    monthMap.set(month, current);
  });

  const revenueByMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stats]) => ({
      month,
      revenue: stats.revenue,
      paid: stats.paid,
      invoiceCount: stats.invoiceCount,
    }));

  return {
    totalAmount,
    paidAmount,
    outstandingAmount,
    overdueAmount,
    countByStatus,
    revenueByMonth,
  };
}

export function formatReportMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-');
  const labels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const index = Number(monthNum) - 1;
  if (index < 0 || index > 11 || !year) return month;
  return `${labels[index]} ${year}`;
}

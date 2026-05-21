export const shipmentStatusColors: Record<string, string> = {
  planned: '#F59E0B',
  in_transit: '#3B82F6',
  at_checkpoint: '#8B5CF6',
  delivered: '#10B981',
  delayed: '#EF4444',
};

export const shipmentStatusLabels: Record<string, string> = {
  planned: 'Запланирован',
  in_transit: 'В пути',
  at_checkpoint: 'На пункте',
  delivered: 'Доставлен',
  delayed: 'Задержка',
};

export const shipmentStatusBg: Record<string, string> = {
  planned: '#FEF3C7',
  in_transit: '#DBEAFE',
  at_checkpoint: '#EDE9FE',
  delivered: '#DCFCE7',
  delayed: '#FEE2E2',
};

export function pluralPoints(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} точка`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} точки`;
  return `${n} точек`;
}

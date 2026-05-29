import {
  clients,
  financeRecords,
  managers,
  monthlyStats,
  shipments,
  transportShare,
} from '../data/mock';
import { buildFinanceReport } from '../utils/financeReport';
import type {
  ClientsResponse,
  DashboardData,
  DashboardQuery,
  FinanceReportResponse,
  FinanceResponse,
  ManagersResponse,
  ShipmentResponse,
  ShipmentsResponse,
  TelegramSettingsResponse,
  TrackingResponse,
} from '../types/api';

const ACTIVE_STATUSES = new Set(['planned', 'in_transit', 'at_checkpoint', 'delayed']);

const directionShare = [
  { name: 'Китай', value: 36, color: '#0B4CB8' },
  { name: 'Турция', value: 22, color: '#2563EB' },
  { name: 'Европа', value: 18, color: '#60A5FA' },
  { name: 'СНГ', value: 14, color: '#93C5FD' },
  { name: 'ОАЭ', value: 10, color: '#CBD5E1' },
];

function inDateRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр', '05': 'Май', '06': 'Июн',
  '07': 'Июл', '08': 'Авг', '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
};

function buildMoneyByMonth(
  records: typeof financeRecords,
  scopedShipments: typeof shipments,
): DashboardData['charts']['moneyByMonth'] {
  const buckets = new Map<string, { turnover: number; paid: number; shipments: number }>();

  records.forEach((record) => {
    const period = record.invoiceDate.slice(0, 7);
    const current = buckets.get(period) ?? { turnover: 0, paid: 0, shipments: 0 };
    current.turnover += record.totalAmount;
    current.paid += record.paidAmount;
    current.shipments += 1;
    buckets.set(period, current);
  });

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, values]) => ({
      month: MONTH_LABELS[period.slice(5, 7)] ?? period,
      turnover: values.turnover,
      paid: values.paid,
      shipments: values.shipments,
      active: scopedShipments.filter((shipment) => ACTIVE_STATUSES.has(shipment.status) && shipment.createdAt.startsWith(period)).length,
    }));
}

export function getDashboardDataMock(query?: DashboardQuery): DashboardData {
  const filteredFinance = financeRecords.filter((record) => inDateRange(record.invoiceDate, query?.dateFrom, query?.dateTo));
  const filteredShipments = shipments.filter((shipment) => inDateRange(shipment.createdAt, query?.dateFrom, query?.dateTo));

  const monthlyTurnover = filteredFinance.reduce((sum, record) => sum + record.totalAmount, 0);
  const totalPaid = filteredFinance.reduce((sum, record) => sum + record.paidAmount, 0);
  const activeShipments = filteredShipments.filter((shipment) => ACTIVE_STATUSES.has(shipment.status)).length;
  const completedShipments = filteredShipments.filter((shipment) => shipment.status === 'delivered').length;
  const moneyByMonth = buildMoneyByMonth(filteredFinance, filteredShipments);

  return {
    summary: {
      monthlyTurnover,
      totalPaid,
      activeShipments,
      completedShipments,
      receivable: monthlyTurnover - totalPaid,
    },
    monthlyStats: monthlyStats
      .filter((stat) => inDateRange(`${stat.month}-01`, query?.dateFrom, query?.dateTo))
      .map((stat) => ({
        month: stat.month,
        shipments: stat.shipments,
        revenue: stat.revenue,
      })),
    transportShare,
    managers: managers.map((manager) => ({
      name: manager.name,
      activeShipments: manager.activeShipments,
    })),
    charts: {
      moneyByMonth,
      directionShare: moneyByMonth.length > 0 ? directionShare : [],
    },
  };
}

export function getShipmentsMock(): ShipmentsResponse {
  return { shipments };
}

export function getShipmentMock(id: string): ShipmentResponse {
  const shipment = shipments.find((item) => item.id === id);
  if (!shipment) {
    throw new Error(`Shipment not found: ${id}`);
  }
  return { shipment };
}

export function getTrackingDataMock(): TrackingResponse {
  return {
    shipments: shipments.map((shipment) => ({
      ...shipment,
      client: clients.find((client) => client.id === shipment.clientId),
      manager: managers.find((manager) => manager.id === shipment.managerId) ?? null,
    })),
  };
}

export function getClientsMock(): ClientsResponse {
  return { clients };
}

export function getManagersMock(): ManagersResponse {
  return {
    managers,
    clients,
    shipments: shipments.map((shipment) => ({
      ...shipment,
      client: clients.find((client) => client.id === shipment.clientId),
      manager: managers.find((manager) => manager.id === shipment.managerId) ?? null,
    })),
  };
}

export function getFinanceMock(): FinanceResponse {
  return {
    financeRecords: financeRecords.map((record) => ({
      ...record,
      client: clients.find((client) => client.id === record.clientId),
      shipment: shipments.find((shipment) => shipment.id === record.shipmentId),
    })),
    clients,
  };
}

export function getFinanceReportMock(): FinanceReportResponse {
  return { report: buildFinanceReport(financeRecords) };
}

export function getTelegramSettingsMock(): TelegramSettingsResponse {
  return {
    settings: {
      id: 'tg1',
      displayName: 'Default Demo',
      telegramChatId: '-1001234567890',
      telegramUsername: 'LogistixNotifyBot',
      enabled: true,
      notificationsEnabled: true,
      notifyShipmentCreated: true,
      notifyStatusChanged: true,
      notifyCheckpointAdded: true,
      lastTestedAt: null,
      lastTestStatus: null,
    },
    shipments: shipments.filter((shipment) => shipment.telegramNotifications),
  };
}

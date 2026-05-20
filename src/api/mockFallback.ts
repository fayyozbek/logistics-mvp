import {
  clients,
  financeRecords,
  managers,
  monthlyStats,
  shipments,
  transportShare,
} from '../data/mock';
import type {
  DashboardData,
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

export function getDashboardDataMock(): DashboardData {
  const monthlyTurnover = financeRecords.reduce((sum, record) => sum + record.totalAmount, 0);
  const totalPaid = financeRecords.reduce((sum, record) => sum + record.paidAmount, 0);
  const activeShipments = shipments.filter((shipment) => ACTIVE_STATUSES.has(shipment.status)).length;
  const completedShipments = shipments.filter((shipment) => shipment.status === 'delivered').length;

  return {
    summary: {
      monthlyTurnover,
      totalPaid,
      activeShipments,
      completedShipments,
      receivable: monthlyTurnover - totalPaid,
    },
    monthlyStats: monthlyStats.map((stat) => ({
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
      moneyByMonth: [
        { month: 'Апр', turnover: 212000, paid: 166000, shipments: 64, active: 14 },
        {
          month: 'Май',
          turnover: monthlyTurnover,
          paid: totalPaid,
          shipments: shipments.length,
          active: activeShipments,
        },
      ],
      directionShare,
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
  return { shipments };
}

export function getManagersMock(): ManagersResponse {
  return { managers, clients, shipments };
}

export function getFinanceMock(): FinanceResponse {
  return { financeRecords, clients };
}

export function getTelegramSettingsMock(): TelegramSettingsResponse {
  return {
    settings: {
      id: 'tg1',
      botToken: '••••••••••••',
      chatId: '-1001234567890',
      connected: true,
      eventFlags: {
        departure: true,
        checkpoint: true,
        customs: true,
        delay: true,
        delivery: true,
        payment: false,
        docs: false,
      },
    },
    shipments: shipments.filter((shipment) => shipment.telegramNotifications),
  };
}

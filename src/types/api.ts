import type { CheckPoint, Client, FinanceRecord, Manager, Shipment, ShipmentStatus, TransportType } from '../data/mock';

export interface DashboardSummary {
  monthlyTurnover: number;
  totalPaid: number;
  activeShipments: number;
  completedShipments: number;
  receivable: number;
}

export interface DashboardMonthlyStat {
  month: string;
  shipments: number;
  revenue: number;
}

export interface DashboardChartSlice {
  name: string;
  value: number;
  color: string;
}

export interface DashboardMoneyByMonth {
  month: string;
  turnover: number;
  paid: number;
  shipments: number;
  active: number;
}

export interface DashboardManagerStat {
  name: string;
  activeShipments: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  monthlyStats: DashboardMonthlyStat[];
  transportShare: DashboardChartSlice[];
  managers: DashboardManagerStat[];
  charts: {
    moneyByMonth: DashboardMoneyByMonth[];
    directionShare: DashboardChartSlice[];
  };
}

export interface ShipmentsResponse {
  shipments: Shipment[];
}

export interface ShipmentResponse {
  shipment: Shipment;
}

export interface CreateShipmentCheckpointPayload {
  city: string;
  country?: string;
  address: string;
  plannedAt: string;
  status?: CheckPoint['status'];
  note?: string;
}

export interface AddShipmentCheckpointPayload extends CreateShipmentCheckpointPayload {
  insertAfter?: number;
  arrivedAt?: string;
}

export interface UpdateCheckpointPayload {
  city?: string;
  country?: string;
  address?: string;
  plannedAt?: string;
  arrivedAt?: string;
  status?: CheckPoint['status'];
  note?: string;
}

export interface CheckpointResponse {
  checkpoint: CheckPoint;
}

export interface CreateShipmentPayload {
  clientId: number;
  managerId?: number;
  type: TransportType;
  origin: string;
  destination: string;
  cargo?: string;
  weight?: string;
  volume?: string;
  estimatedDelivery?: string;
  telegramNotifications?: boolean;
  trackingNumber?: string;
  checkpoints?: CreateShipmentCheckpointPayload[];
}

export interface UpdateShipmentStatusPayload {
  status: ShipmentStatus;
  note?: string;
}

export type ApiValidationErrors = Record<string, string[]>;

export interface TrackingResponse {
  shipments: Shipment[];
}

export interface ManagersResponse {
  managers: Manager[];
  clients: Client[];
  shipments: Shipment[];
}

export interface FinanceResponse {
  financeRecords: FinanceRecord[];
  clients: Client[];
}

export interface TelegramEventFlags {
  departure?: boolean;
  checkpoint?: boolean;
  customs?: boolean;
  delay?: boolean;
  delivery?: boolean;
  payment?: boolean;
  docs?: boolean;
}

export interface TelegramSettings {
  id: string;
  botToken: string | null;
  chatId: string | null;
  connected: boolean;
  eventFlags: TelegramEventFlags;
}

export interface TelegramSettingsResponse {
  settings: TelegramSettings | null;
  shipments: Shipment[];
}

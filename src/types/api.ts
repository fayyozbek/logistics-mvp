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
  weightUnit?: string;
  volume?: string;
  volumeUnit?: string;
  estimatedDelivery?: string;
  telegramNotifications?: boolean;
  trackingNumber?: string;
  checkpoints?: CreateShipmentCheckpointPayload[];
}

export interface UpdateShipmentStatusPayload {
  status: ShipmentStatus;
  note?: string;
}

export interface UpdateShipmentPayload {
  clientId?: number;
  managerId?: number | null;
  type?: TransportType;
  origin?: string;
  destination?: string;
  cargo?: string;
  weight?: string;
  weightUnit?: string;
  volume?: string;
  volumeUnit?: string;
  plannedPickup?: string;
  estimatedDelivery?: string;
  notes?: string;
  telegramNotifications?: boolean;
}

export interface DeleteShipmentResponse {
  message: string;
  shipmentId: string;
}

export type ApiValidationErrors = Record<string, string[]>;

export interface TrackingResponse {
  shipments: Shipment[];
}

export interface ClientsResponse {
  clients: Client[];
}

export interface ClientResponse {
  client: Client;
}

export interface CreateClientPayload {
  company: string;
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
}

export interface UpdateClientPayload {
  company?: string;
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
}

export interface DeleteClientResponse {
  message: string;
  clientId: string;
}

export interface ManagersResponse {
  managers: Manager[];
  clients: Client[];
  shipments: Shipment[];
}

export interface ManagerResponse {
  manager: Manager;
}

export interface CreateManagerPayload {
  name: string;
  email?: string;
  phone?: string;
  telegramId?: string;
  region?: string;
  role?: string;
  department?: string;
  avatar?: string;
}

export interface UpdateManagerPayload {
  name?: string;
  email?: string;
  phone?: string;
  telegramId?: string;
  region?: string;
  role?: string;
  department?: string;
  avatar?: string;
}

export interface DeleteManagerResponse {
  message: string;
  managerId: string;
}

export interface FinanceResponse {
  financeRecords: FinanceRecord[];
  clients: Client[];
}

export interface FinanceReportMonthStat {
  month: string;
  revenue: number;
  paid: number;
  invoiceCount: number;
}

export interface FinanceReportSummary {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  countByStatus: Record<FinanceRecord['status'], number>;
  revenueByMonth: FinanceReportMonthStat[];
}

export interface FinanceReportResponse {
  report: FinanceReportSummary;
}

export interface UpdateFinanceStatusPayload {
  status: FinanceRecord['status'];
}

export interface FinanceRecordResponse {
  financeRecord: FinanceRecord;
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

export interface UpdateTelegramSettingsPayload {
  botToken?: string;
  chatId?: string;
  connected?: boolean;
  eventFlags?: TelegramEventFlags;
}

export interface UpdateTelegramSettingsResponse {
  settings: TelegramSettings;
}

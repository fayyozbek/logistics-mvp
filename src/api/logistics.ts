import type {
  AddShipmentCheckpointPayload,
  CheckpointResponse,
  DeleteCheckpointResponse,
  ClientResponse,
  ClientsResponse,
  CreateClientPayload,
  CreateShipmentPayload,
  DeleteClientResponse,
  DashboardData,
  DashboardQuery,
  FinanceRecordResponse,
  FinanceReportResponse,
  FinanceResponse,
  UpdateFinanceStatusPayload,
  CreateManagerPayload,
  DeleteManagerResponse,
  ManagerResponse,
  ManagersResponse,
  ShipmentResponse,
  ShipmentsResponse,
  TelegramSettingsResponse,
  UpdateTelegramSettingsPayload,
  UpdateTelegramSettingsResponse,
  TrackingResponse,
  DeleteShipmentResponse,
  UpdateClientPayload,
  UpdateManagerPayload,
  UpdateCheckpointPayload,
  UpdateShipmentPayload,
  UpdateShipmentStatusPayload,
} from '../types/api';
import {
  apiNotConfiguredError,
  deleteJson,
  downloadCsv,
  encodeResourceId,
  isApiConfigured,
  patchJson,
  postJson,
  requestWithMockFallback,
} from './client';
import { buildFinanceExportCsv, buildShipmentsExportCsv } from '../utils/exportCsv';
import {
  getClientsMock,
  getDashboardDataMock,
  getFinanceMock,
  getFinanceReportMock,
  getManagersMock,
  getShipmentMock,
  getShipmentsMock,
  getTelegramSettingsMock,
  getTrackingDataMock,
} from './mockFallback';

function buildDashboardPath(query?: DashboardQuery): string {
  const params = new URLSearchParams();
  if (query?.dateFrom) params.set('date_from', query.dateFrom);
  if (query?.dateTo) params.set('date_to', query.dateTo);
  if (query?.chartPeriod) params.set('chart_period', query.chartPeriod);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : '/dashboard';
}

function resourcePath(base: string, id: string, suffix = ''): string {
  return `${base}/${encodeResourceId(id)}${suffix}`;
}

function configuredPost<T>(action: string, path: string, payload: unknown): Promise<T> {
  if (!isApiConfigured()) {
    return Promise.reject(apiNotConfiguredError(action));
  }
  return postJson<T>(path, payload);
}

function configuredPatch<T>(action: string, path: string, payload: unknown): Promise<T> {
  if (!isApiConfigured()) {
    return Promise.reject(apiNotConfiguredError(action));
  }
  return patchJson<T>(path, payload);
}

function configuredDelete<T>(action: string, path: string): Promise<T> {
  if (!isApiConfigured()) {
    return Promise.reject(apiNotConfiguredError(action));
  }
  return deleteJson<T>(path);
}

export function getDashboardData(query?: DashboardQuery): Promise<DashboardData> {
  const path = buildDashboardPath(query);
  return requestWithMockFallback(path, () => getDashboardDataMock(query));
}

export function getShipments(): Promise<ShipmentsResponse> {
  return requestWithMockFallback('/shipments', getShipmentsMock);
}

export function getShipment(id: string): Promise<ShipmentResponse> {
  return requestWithMockFallback(resourcePath('/shipments', id), () => getShipmentMock(id));
}

export function getTrackingData(): Promise<TrackingResponse> {
  return requestWithMockFallback('/tracking', getTrackingDataMock);
}

export function getManagers(): Promise<ManagersResponse> {
  return requestWithMockFallback('/managers/overview', getManagersMock);
}

export function createManager(payload: CreateManagerPayload): Promise<ManagerResponse> {
  return configuredPost('Создание менеджера', '/managers', payload);
}

export function updateManager(id: string, payload: UpdateManagerPayload): Promise<ManagerResponse> {
  return configuredPatch('Редактирование менеджера', resourcePath('/managers', id), payload);
}

export function deleteManager(id: string): Promise<DeleteManagerResponse> {
  return configuredDelete('Удаление менеджера', resourcePath('/managers', id));
}

export function getClients(): Promise<ClientsResponse> {
  return requestWithMockFallback('/clients', getClientsMock);
}

export function getClient(id: string): Promise<ClientResponse> {
  return requestWithMockFallback(resourcePath('/clients', id), () => {
    const client = getClientsMock().clients.find((item) => item.id === id);
    if (!client) {
      throw new Error(`Client not found: ${id}`);
    }
    return { client };
  });
}

export function createClient(payload: CreateClientPayload): Promise<ClientResponse> {
  return configuredPost('Создание партнёра', '/clients', payload);
}

export function updateClient(id: string, payload: UpdateClientPayload): Promise<ClientResponse> {
  return configuredPatch('Редактирование партнёра', resourcePath('/clients', id), payload);
}

export function deleteClient(id: string): Promise<DeleteClientResponse> {
  return configuredDelete('Удаление партнёра', resourcePath('/clients', id));
}

export function getFinance(): Promise<FinanceResponse> {
  return requestWithMockFallback('/finance', getFinanceMock);
}

export function getFinanceReport(): Promise<FinanceReportResponse> {
  return requestWithMockFallback('/finance/report', getFinanceReportMock);
}

export function exportShipmentsCsv(): Promise<void> {
  return downloadCsv('/export/shipments.csv', 'shipments.csv', buildShipmentsExportCsv);
}

export function exportFinanceCsv(): Promise<void> {
  return downloadCsv('/export/finance.csv', 'finance.csv', buildFinanceExportCsv);
}

export function updateFinanceStatus(
  id: string,
  payload: UpdateFinanceStatusPayload,
): Promise<FinanceRecordResponse> {
  return configuredPatch(
    'Обновление статуса счёта',
    resourcePath('/finance', id, '/status'),
    payload,
  );
}

export function getTelegramSettings(): Promise<TelegramSettingsResponse> {
  return requestWithMockFallback('/telegram/settings', getTelegramSettingsMock);
}

export function updateTelegramSettings(
  payload: UpdateTelegramSettingsPayload,
): Promise<UpdateTelegramSettingsResponse> {
  return configuredPatch('Обновление настроек Telegram', '/telegram/settings', payload);
}

export function createShipment(payload: CreateShipmentPayload): Promise<ShipmentResponse> {
  return configuredPost('Создание груза', '/shipments', payload);
}

export function updateShipment(
  id: string,
  payload: UpdateShipmentPayload,
): Promise<ShipmentResponse> {
  return configuredPatch('Редактирование груза', resourcePath('/shipments', id), payload);
}

export function deleteShipment(id: string): Promise<DeleteShipmentResponse> {
  return configuredDelete('Удаление груза', resourcePath('/shipments', id));
}

export function updateShipmentStatus(
  id: string,
  payload: UpdateShipmentStatusPayload,
): Promise<ShipmentResponse> {
  return configuredPatch('Обновление статуса', resourcePath('/shipments', id, '/status'), payload);
}

export function addShipmentCheckpoint(
  shipmentId: string,
  payload: AddShipmentCheckpointPayload,
): Promise<CheckpointResponse> {
  return configuredPost(
    'Добавление точек маршрута',
    resourcePath('/shipments', shipmentId, '/checkpoints'),
    payload,
  );
}

export function updateCheckpoint(
  checkpointId: string,
  payload: UpdateCheckpointPayload,
): Promise<CheckpointResponse> {
  return configuredPatch('Обновление точек маршрута', resourcePath('/checkpoints', checkpointId), payload);
}

export function deleteCheckpoint(checkpointId: string): Promise<DeleteCheckpointResponse> {
  return configuredDelete('Удаление точек маршрута', resourcePath('/checkpoints', checkpointId));
}

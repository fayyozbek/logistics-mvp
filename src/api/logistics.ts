import type {
  AddShipmentCheckpointPayload,
  CheckpointResponse,
  ClientsResponse,
  ClientResponse,
  CreateClientPayload,
  CreateManagerPayload,
  CreateShipmentPayload,
  DashboardData,
  DeleteEntityResponse,
  FinanceRecordResponse,
  FinanceResponse,
  ManagerResponse,
  UpdateFinanceStatusPayload,
  UpdateClientPayload,
  UpdateManagerPayload,
  ManagersResponse,
  ShipmentResponse,
  ShipmentsResponse,
  TelegramNotificationsQuery,
  TelegramNotificationsResponse,
  TelegramSettingsResponse,
  TelegramStatus,
  UpdateTelegramSettingsPayload,
  UpdateTelegramSettingsResponse,
  SendTestMessagePayload,
  SendTestMessageResponse,
  TrackingResponse,
  UpdateCheckpointPayload,
  UpdateShipmentStatusPayload,
} from '../types/api';
import { ApiError, deleteJson, isApiConfigured, patchJson, postJson, requestWithMockFallback } from './client';
import {
  getDashboardDataMock,
  getFinanceMock,
  getManagersMock,
  getClientsMock,
  getShipmentMock,
  getShipmentsMock,
  getTelegramSettingsMock,
  getTrackingDataMock,
} from './mockFallback';

export function getDashboardData(): Promise<DashboardData> {
  return requestWithMockFallback('/dashboard', getDashboardDataMock);
}

export function getShipments(): Promise<ShipmentsResponse> {
  return requestWithMockFallback('/shipments', getShipmentsMock);
}

export function getShipment(id: string): Promise<ShipmentResponse> {
  const encodedId = encodeURIComponent(id);
  return requestWithMockFallback(`/shipments/${encodedId}`, () => getShipmentMock(id));
}

export function getTrackingData(): Promise<TrackingResponse> {
  return requestWithMockFallback('/tracking', getTrackingDataMock);
}

export function getManagers(): Promise<ManagersResponse> {
  return requestWithMockFallback('/managers', getManagersMock);
}

export function getClients(): Promise<ClientsResponse> {
  return requestWithMockFallback('/clients', getClientsMock);
}

function requireApi(): void {
  if (!isApiConfigured()) {
    throw new ApiError('Действие доступно только при подключённом API (VITE_API_BASE_URL).', 0);
  }
}

export function createManager(payload: CreateManagerPayload): Promise<ManagerResponse> {
  requireApi();
  return postJson<ManagerResponse>('/managers', payload);
}

export function updateManager(id: string, payload: UpdateManagerPayload): Promise<ManagerResponse> {
  requireApi();
  return patchJson<ManagerResponse>(`/managers/${encodeURIComponent(id)}`, payload);
}

export function deleteManager(id: string): Promise<DeleteEntityResponse> {
  requireApi();
  return deleteJson<DeleteEntityResponse>(`/managers/${encodeURIComponent(id)}`);
}

export function createClient(payload: CreateClientPayload): Promise<ClientResponse> {
  requireApi();
  return postJson<ClientResponse>('/clients', payload);
}

export function updateClient(id: string, payload: UpdateClientPayload): Promise<ClientResponse> {
  requireApi();
  return patchJson<ClientResponse>(`/clients/${encodeURIComponent(id)}`, payload);
}

export function deleteClient(id: string): Promise<DeleteEntityResponse> {
  requireApi();
  return deleteJson<DeleteEntityResponse>(`/clients/${encodeURIComponent(id)}`);
}

export function getFinance(): Promise<FinanceResponse> {
  return requestWithMockFallback('/finance', getFinanceMock);
}

export function updateFinanceStatus(
  id: string,
  payload: UpdateFinanceStatusPayload,
): Promise<FinanceRecordResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Обновление статуса счёта доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return patchJson<FinanceRecordResponse>(`/finance/${encodedId}/status`, payload);
}

export function getTelegramSettings(): Promise<TelegramSettingsResponse> {
  return requestWithMockFallback('/telegram/settings', getTelegramSettingsMock);
}

export function updateTelegramSettings(
  payload: UpdateTelegramSettingsPayload,
): Promise<UpdateTelegramSettingsResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Обновление настроек Telegram доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  return patchJson<UpdateTelegramSettingsResponse>('/telegram/settings', payload);
}

const defaultTelegramStatus: TelegramStatus = {
  configured: false,
  enabled: false,
  hasChatId: false,
  notificationsEnabled: false,
  botTokenSource: null,
};

export function getTelegramStatus(): Promise<TelegramStatus> {
  return requestWithMockFallback('/telegram/status', () => defaultTelegramStatus);
}

export function sendTelegramTestMessage(
  payload?: SendTestMessagePayload,
): Promise<SendTestMessageResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Отправка тестового сообщения доступна только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  return postJson<SendTestMessageResponse>('/telegram/test-message', payload ?? {});
}

const emptyNotificationsResponse: TelegramNotificationsResponse = {
  notifications: [],
  meta: { page: 1, limit: 50, total: 0 },
};

export function getTelegramNotifications(
  query: TelegramNotificationsQuery = {},
): Promise<TelegramNotificationsResponse> {
  if (!isApiConfigured()) {
    return Promise.resolve(emptyNotificationsResponse);
  }

  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.event_type) params.set('event_type', query.event_type);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.page) params.set('page', String(query.page));

  const qs = params.toString();
  const path = qs ? `/telegram/notifications?${qs}` : '/telegram/notifications';

  return requestWithMockFallback(path, () => emptyNotificationsResponse);
}

export function createShipment(payload: CreateShipmentPayload): Promise<ShipmentResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Создание груза доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  return postJson<ShipmentResponse>('/shipments', payload);
}

export function updateShipmentStatus(
  id: string,
  payload: UpdateShipmentStatusPayload,
): Promise<ShipmentResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Обновление статуса доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return patchJson<ShipmentResponse>(`/shipments/${encodedId}/status`, payload);
}

export function deleteShipment(id: string): Promise<{ message: string }> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Архивация груза доступна только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return deleteJson<{ message: string }>(`/shipments/${encodedId}`);
}

export function addShipmentCheckpoint(
  shipmentId: string,
  payload: AddShipmentCheckpointPayload,
): Promise<CheckpointResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Добавление точек маршрута доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(shipmentId);
  return postJson<CheckpointResponse>(`/shipments/${encodedId}/checkpoints`, payload);
}

export function updateCheckpoint(
  checkpointId: string,
  payload: UpdateCheckpointPayload,
): Promise<CheckpointResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Обновление точек маршрута доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(checkpointId);
  return patchJson<CheckpointResponse>(`/checkpoints/${encodedId}`, payload);
}

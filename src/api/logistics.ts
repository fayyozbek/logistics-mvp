import type {
  AddShipmentCheckpointPayload,
  CheckpointResponse,
  CreateShipmentPayload,
  DashboardData,
  FinanceRecordResponse,
  FinanceResponse,
  UpdateFinanceStatusPayload,
  ManagersResponse,
  ShipmentResponse,
  ShipmentsResponse,
  TelegramSettingsResponse,
  UpdateTelegramSettingsPayload,
  UpdateTelegramSettingsResponse,
  TrackingResponse,
  UpdateCheckpointPayload,
  UpdateShipmentStatusPayload,
} from '../types/api';
import { ApiError, isApiConfigured, patchJson, postJson, requestWithMockFallback } from './client';
import {
  getDashboardDataMock,
  getFinanceMock,
  getManagersMock,
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

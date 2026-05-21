import type {
  AddShipmentCheckpointPayload,
  CheckpointResponse,
  ClientResponse,
  ClientsResponse,
  CreateClientPayload,
  CreateShipmentPayload,
  DeleteClientResponse,
  DashboardData,
  FinanceRecordResponse,
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
import { ApiError, deleteJson, isApiConfigured, patchJson, postJson, requestWithMockFallback } from './client';
import {
  getClientsMock,
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
  return requestWithMockFallback('/managers/overview', getManagersMock);
}

export function createManager(payload: CreateManagerPayload): Promise<ManagerResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Создание менеджера доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  return postJson<ManagerResponse>('/managers', payload);
}

export function updateManager(id: string, payload: UpdateManagerPayload): Promise<ManagerResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Редактирование менеджера доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return patchJson<ManagerResponse>(`/managers/${encodedId}`, payload);
}

export function deleteManager(id: string): Promise<DeleteManagerResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Удаление менеджера доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return deleteJson<DeleteManagerResponse>(`/managers/${encodedId}`);
}

export function getClients(): Promise<ClientsResponse> {
  return requestWithMockFallback('/clients', getClientsMock);
}

export function getClient(id: string): Promise<ClientResponse> {
  const encodedId = encodeURIComponent(id);
  return requestWithMockFallback(`/clients/${encodedId}`, () => {
    const client = getClientsMock().clients.find((item) => item.id === id);
    if (!client) {
      throw new Error(`Client not found: ${id}`);
    }
    return { client };
  });
}

export function createClient(payload: CreateClientPayload): Promise<ClientResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Создание партнёра доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  return postJson<ClientResponse>('/clients', payload);
}

export function updateClient(id: string, payload: UpdateClientPayload): Promise<ClientResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Редактирование партнёра доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return patchJson<ClientResponse>(`/clients/${encodedId}`, payload);
}

export function deleteClient(id: string): Promise<DeleteClientResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Удаление партнёра доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return deleteJson<DeleteClientResponse>(`/clients/${encodedId}`);
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

export function updateShipment(
  id: string,
  payload: UpdateShipmentPayload,
): Promise<ShipmentResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Редактирование груза доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return patchJson<ShipmentResponse>(`/shipments/${encodedId}`, payload);
}

export function deleteShipment(id: string): Promise<DeleteShipmentResponse> {
  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError('Удаление груза доступно только при подключённом API (VITE_API_BASE_URL).', 0),
    );
  }

  const encodedId = encodeURIComponent(id);
  return deleteJson<DeleteShipmentResponse>(`/shipments/${encodedId}`);
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

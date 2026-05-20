import type {
  DashboardData,
  FinanceResponse,
  ManagersResponse,
  ShipmentResponse,
  ShipmentsResponse,
  TelegramSettingsResponse,
  TrackingResponse,
} from '../types/api';
import { requestWithMockFallback } from './client';
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

export function getTelegramSettings(): Promise<TelegramSettingsResponse> {
  return requestWithMockFallback('/telegram/settings', getTelegramSettingsMock);
}

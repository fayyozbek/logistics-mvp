import type {
  CreateUserPayload,
  DeactivateUserResponse,
  UpdateUserPayload,
  UserResponse,
  UsersResponse,
} from '../types/api';
import {
  apiNotConfiguredError,
  deleteJson,
  encodeResourceId,
  getJson,
  isApiConfigured,
  patchJson,
  postJson,
} from './client';

function resourcePath(id: string): string {
  return `/users/${encodeResourceId(id)}`;
}

function configuredGet<T>(action: string, path: string): Promise<T> {
  if (!isApiConfigured()) {
    return Promise.reject(apiNotConfiguredError(action));
  }
  return getJson<T>(path);
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

export function getUsers(limit = 100): Promise<UsersResponse> {
  const params = new URLSearchParams();
  params.set('limit', String(Math.min(Math.max(limit, 1), 100)));
  return configuredGet('Загрузка пользователей', `/users?${params.toString()}`);
}

export function getUser(id: string): Promise<UserResponse> {
  return configuredGet('Загрузка пользователя', resourcePath(id));
}

export function createUser(payload: CreateUserPayload): Promise<UserResponse> {
  return configuredPost('Создание пользователя', '/users', payload);
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<UserResponse> {
  return configuredPatch('Обновление пользователя', resourcePath(id), payload);
}

export function deactivateUser(id: string): Promise<DeactivateUserResponse> {
  return configuredDelete('Деактивация пользователя', resourcePath(id));
}

/** @deprecated Use deactivateUser — backend DELETE deactivates, does not hard-delete. */
export function deleteUser(id: string): Promise<DeactivateUserResponse> {
  return deactivateUser(id);
}

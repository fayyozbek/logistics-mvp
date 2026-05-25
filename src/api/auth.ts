import type { LoginResponse, MeResponse } from '../types/auth';
import { postJson, requestJsonPublic } from './client';

export function login(email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>('/auth/login', { email, password }, { skipAuth: true });
}

export function logout(): Promise<{ message: string }> {
  return postJson<{ message: string }>('/auth/logout', {});
}

export function fetchMe(): Promise<MeResponse> {
  return requestJsonPublic<MeResponse>('/auth/me');
}

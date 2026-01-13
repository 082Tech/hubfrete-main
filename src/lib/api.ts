// API client for n8n workflows
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'https://n8n.srv1251718.hstgr.cloud';

export interface LoginResponse {
  output: string;
  jwttoken?: string;
}

export interface VerifyCodeResponse {
  output: string;
  jwttoken?: string;
}

export interface User {
  id: number;
  email: string;
  cargo: string;
  created_at?: string;
}

export interface Empresa {
  id: number;
  tipo: 'EMBARCADOR' | 'TRANSPORTADORA';
  classe: string;
  created_at?: string;
}

export interface N8nResponse<T> {
  status: number;
  ok: boolean;
  headers: Headers;
  data: T | null;
  raw: string;
}

async function parseN8nResponse<T = unknown>(
  res: Response
): Promise<{
  status: number;
  ok: boolean;
  headers: Headers;
  data: T | null;
  raw: string;
}> {
  const raw = await res.text();

  let data: T | null = null;

  if (raw.trim()) {
    try {
      data = JSON.parse(raw) as T;
    } catch {
      // Body não é JSON → você ainda tem o raw
      data = raw as unknown as T;
    }
  }

  if (!res.ok) {
    // Não assume estrutura
    throw new Error(
      typeof data === 'string'
        ? data
        : JSON.stringify(data) || `HTTP ${res.status}`
    );
  }

  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data,
    raw,
  };
}

// Login admin (SuperAdmins table) - sends 2FA code to email
export async function loginAdmin(
  email: string,
  senha: string
): Promise<N8nResponse<LoginResponse>> {
  const res = await fetch(`${N8N_BASE_URL}/webhook/loginadmin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });

  return parseN8nResponse<LoginResponse>(res);
}

// Login user (Users table) - sends 2FA code to email
export async function loginUser(
  email: string,
  senha: string
): Promise<N8nResponse<LoginResponse>> {
  const res = await fetch(`${N8N_BASE_URL}/webhook/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });

  return parseN8nResponse<LoginResponse>(res);
}

// Verify 2FA code
export async function verifyCode(
  email: string,
  code: number
): Promise<N8nResponse<VerifyCodeResponse>> {
  const res = await fetch(`${N8N_BASE_URL}/webhook/v2f`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  return parseN8nResponse<VerifyCodeResponse>(res);
}

// Create new user
export async function createUser(
  email: string,
  senha: string,
  cargo: string
): Promise<N8nResponse<{ output: string }>> {
  const res = await fetch(`${N8N_BASE_URL}/webhook/singup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha, cargo }),
  });

  return parseN8nResponse<{ output: string }>(res);
}

// Forgot password - request code via email
export async function forgotPasswordRequest(
  email: string
): Promise<N8nResponse<{ output: string }>> {
  const res = await fetch(`${N8N_BASE_URL}/webhook/forget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return parseN8nResponse<{ output: string }>(res);
}

// Forgot password - confirm with code
export async function forgotPasswordConfirm(
  email: string,
  code: number,
  novaSenha: string
): Promise<N8nResponse<{ output: string }>> {
  const res = await fetch(`${N8N_BASE_URL}/webhook/forget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, novaSenha }),
  });

  return parseN8nResponse<{ output: string }>(res);
}

// Change password (with current password)
export async function changePassword(
  email: string,
  senha: string,
  novaSenha: string
): Promise<N8nResponse<{ output: string }>> {
  const res = await fetch(`${N8N_BASE_URL}/webhook/forget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha, novaSenha }),
  });

  return parseN8nResponse<{ output: string }>(res);
}

// Get all users (requires JWT auth)
export async function getUsers(id?: number): Promise<User[]> {
  const token = getAuthToken();
  const url = id
    ? `${N8N_BASE_URL}/webhook/usuarios?id=${id}`
    : `${N8N_BASE_URL}/webhook/usuarios`;

  const response = await fetch(url, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  return response.json();
}

// Get all empresas (requires JWT auth)
export async function getEmpresas(tipo?: 'EMBARCADOR' | 'TRANSPORTADORA'): Promise<Empresa[]> {
  const token = getAuthToken();
  const url = tipo
    ? `${N8N_BASE_URL}/webhook/empresas?tipo=${tipo}`
    : `${N8N_BASE_URL}/webhook/empresas`;

  const response = await fetch(url, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  return response.json();
}

// Auth state management
const AUTH_TOKEN_KEY = 'hubfrete_jwt';
const AUTH_USER_KEY = 'hubfrete_user';

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthUser(email: string) {
  localStorage.setItem(AUTH_USER_KEY, email);
}

export function getAuthUser(): string | null {
  return localStorage.getItem(AUTH_USER_KEY);
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

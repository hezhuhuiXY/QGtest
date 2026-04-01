export interface AdminUser {
  adminId: string;
  password: string;
}

export interface RepairItem {
  id?: number;
  studentId: string;
  dorm: string;
  content?: string;
  status: string;
}

export interface AuthResult<TUser> {
  user: TUser;
  token: string;
}

const BASE_URL_KEY = 'repair-base-url';
const TOKEN_KEY = 'repair-token';

function getBaseURL(): string {
  return localStorage.getItem(BASE_URL_KEY) || 'http://localhost:8080';
}

function setBaseURL(url: string): void {
  localStorage.setItem(BASE_URL_KEY, url.replace(/\/$/, ''));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${getBaseURL()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json();
  if (payload.code !== 200) {
    throw new Error(payload.msg || '请求失败');
  }
  return payload.data as T;
}

export const storageKeys = {
  token: TOKEN_KEY,
  role: 'repair-role',
  user: 'repair-user'
};

export const authApi = {
  adminLogin(payload: AdminUser) {
    return request<AuthResult<AdminUser>>('/user/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  adminRegister(payload: AdminUser) {
    return request<null>('/user/admin/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

export const repairApi = {
  getAll() {
    return request<RepairItem[]>('/repair/all');
  },
  getDetail(id: number) {
    return request<RepairItem>(`/repair/detail?id=${id}`);
  },
  updateStatus(id: number, status: string) {
    return request<null>(`/repair/updateStatus?id=${id}&status=${encodeURIComponent(status)}`, {
      method: 'POST'
    });
  },
  deleteByIds(ids: number[]) {
    const query = ids.map((id) => `ids=${id}`).join('&');
    return request<null>(`/repair/delete?${query}`, {
      method: 'DELETE'
    });
  }
};

export const configApi = {
  getBaseURL,
  setBaseURL
};

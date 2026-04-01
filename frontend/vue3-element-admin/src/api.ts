import axios from 'axios';
import type { AdminUser, AuthResult, RepairItem, StudentUser } from './types';

const BASE_URL_KEY = 'repair-base-url';
const TOKEN_KEY = 'repair-token';

const http = axios.create({
  baseURL: localStorage.getItem(BASE_URL_KEY) || 'http://localhost:8080',
  timeout: 10000
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload?.code !== 200) {
      return Promise.reject(new Error(payload?.msg || '请求失败'));
    }
    return payload.data;
  },
  (error) => Promise.reject(error)
);

export const apiConfig = {
  getBaseURL() {
    return localStorage.getItem(BASE_URL_KEY) || 'http://localhost:8080';
  },
  setBaseURL(url: string) {
    const normalized = url.replace(/\/$/, '');
    localStorage.setItem(BASE_URL_KEY, normalized);
    http.defaults.baseURL = normalized;
  }
};

export const authApi = {
  studentLogin(payload: Pick<StudentUser, 'studentId' | 'password'>) {
    return http.post<never, AuthResult<StudentUser>>('/user/student/login', payload);
  },
  adminLogin(payload: Pick<AdminUser, 'adminId' | 'password'>) {
    return http.post<never, AuthResult<AdminUser>>('/user/admin/login', payload);
  },
  studentRegister(payload: Pick<StudentUser, 'studentId' | 'password'>) {
    return http.post('/user/student/register', payload);
  },
  adminRegister(payload: AdminUser) {
    return http.post('/user/admin/register', payload);
  }
};

export const studentApi = {
  bindDorm(payload: Pick<StudentUser, 'studentId' | 'password' | 'dormitory'>) {
    return http.post('/student/bindDorm', payload);
  },
  updatePassword(payload: { studentId: string; oldPassword: string; newPassword: string }) {
    return http.post('/student/updatePwd', payload);
  }
};

export const repairApi = {
  create(payload: RepairItem) {
    return http.post('/repair/add', payload);
  },
  getMyList(studentId: string) {
    return http.get<never, RepairItem[]>('/repair/my', { params: { studentId } });
  },
  getAll() {
    return http.get<never, RepairItem[]>('/repair/all');
  },
  getDetail(id: number) {
    return http.get<never, RepairItem>('/repair/detail', { params: { id } });
  },
  updateStatus(id: number, status: string) {
    return http.post('/repair/updateStatus', null, { params: { id, status } });
  },
  deleteByIds(ids: number[]) {
    const query = ids.map((id) => `ids=${id}`).join('&');
    return http.delete(`/repair/delete?${query}`);
  }
};

export { TOKEN_KEY };

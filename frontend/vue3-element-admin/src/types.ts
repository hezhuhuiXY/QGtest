export type UserRole = 'student' | 'admin';

export interface StudentUser {
  id?: number;
  studentId: string;
  password: string;
  dormitory?: string;
  repairOrder?: string;
  conTant?: string;
}

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

export interface ApiResult<T> {
  code: number;
  msg: string;
  data: T;
}

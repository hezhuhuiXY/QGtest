export type UserRole = 'student' | 'admin';

export interface AdminUser {
  adminId: string;
  password: string;
}

export interface StudentUser {
  studentId: string;
  password: string;
  dormitory?: string;
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

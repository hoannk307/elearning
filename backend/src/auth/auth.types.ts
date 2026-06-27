import { Role } from '@prisma/client';

/** Người dùng đã xác thực, gắn vào request.user sau khi qua JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  /** Chỉ có khi role = STUDENT (id của phụ huynh quản lý). */
  parentId?: string;
}

/** Payload mã hoá trong JWT. */
export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
  parentId?: string;
}

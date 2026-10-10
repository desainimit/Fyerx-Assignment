import type { Request } from 'express';

export enum UserRole {
  User = 'user',
  Admin = 'admin',
}

export interface AuthUser {
  readonly id: string;
  readonly role: UserRole;
  readonly email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

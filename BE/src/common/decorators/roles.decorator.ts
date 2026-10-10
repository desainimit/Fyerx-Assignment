import { SetMetadata } from '@nestjs/common';
import { REQUIRED_ROLES_KEY } from '@constants';
import { UserRole } from '@app-types/auth.types';

export const Roles = (...roles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

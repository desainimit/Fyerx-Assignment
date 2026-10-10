import { Controller } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '@decorators';
import { UserRole } from '@app-types/auth.types';

@Controller({ path: 'admin', version: '1' })
@Roles(UserRole.Admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
}

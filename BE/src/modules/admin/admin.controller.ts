import { Controller } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
}

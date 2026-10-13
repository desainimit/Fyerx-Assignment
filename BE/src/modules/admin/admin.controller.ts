import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@decorators';
import { UserRole } from '@app-types/auth.types';
import { CreateEventDto, EventStatusDto, PageQueryDto } from '@dtos';
import { AdminService } from './admin.service';

// Every route here requires a valid JWT with the admin role (403 otherwise).
@ApiTags('Admin')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
@Roles(UserRole.Admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('events')
  @ApiOperation({ summary: 'All events, including inactive and past' })
  list(@Query() query: PageQueryDto) {
    return this.adminService.listEvents(query);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create an event' })
  create(@Body() body: CreateEventDto) {
    return this.adminService.createEvent(body);
  }

  @Patch('events/:id/status')
  @ApiOperation({ summary: 'Make an event active or inactive (no delete)' })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { isActive }: EventStatusDto,
  ) {
    return this.adminService.setStatus(id, isActive);
  }
}

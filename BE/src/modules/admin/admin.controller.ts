import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AdminOnly, ApiEnvelope, ApiError } from '@decorators';
import { CreateEventDto, EventDto, EventStatusDto, PageQueryDto } from '@dtos';
import { AdminService } from './admin.service';

// Every route here requires a valid JWT with the admin role (403 otherwise).
@ApiTags('Admin')
@Controller({ path: 'admin', version: '1' })
@AdminOnly()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('events')
  @ApiOperation({ summary: 'All events, including inactive and past' })
  @ApiEnvelope(EventDto, { paginated: true, message: 'All events' })
  @ApiError(HttpStatus.BAD_REQUEST)
  list(@Query() query: PageQueryDto) {
    return this.adminService.listEvents(query);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create an event' })
  @ApiEnvelope(EventDto, {
    status: HttpStatus.CREATED,
    description: 'Event created',
    message: 'Event created',
  })
  @ApiError(HttpStatus.BAD_REQUEST, 'Invalid body or unknown category')
  create(@Body() body: CreateEventDto) {
    return this.adminService.createEvent(body);
  }

  @Patch('events/:id/status')
  @ApiOperation({ summary: 'Make an event active or inactive (no delete)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiEnvelope(EventDto, { message: 'Event activated' })
  @ApiError(HttpStatus.BAD_REQUEST)
  @ApiError(HttpStatus.NOT_FOUND)
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { isActive }: EventStatusDto,
  ) {
    return this.adminService.setStatus(id, isActive);
  }
}

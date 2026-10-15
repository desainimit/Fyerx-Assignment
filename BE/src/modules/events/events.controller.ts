import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiError, Public } from '@decorators';
import { EventDto, EventFiltersDto, EventQueryDto } from '@dtos';
import { EventsService } from './events.service';

@ApiTags('Events')
@Controller({ path: 'events', version: '1' })
@Public()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary: 'Active, upcoming events, nearest first, with combined filters',
  })
  @ApiEnvelope(EventDto, { paginated: true, message: 'Events' })
  @ApiError(HttpStatus.BAD_REQUEST)
  browse(@Query() query: EventQueryDto) {
    return this.eventsService.browse(query);
  }

  // Declared before ':id' so "filters" is not parsed as an event id.
  @Get('filters')
  @ApiOperation({ summary: 'Categories and cities for the filter controls' })
  @ApiEnvelope(EventFiltersDto, { message: 'Filter options' })
  filters() {
    return this.eventsService.filters();
  }

  @Get(':id')
  @ApiOperation({ summary: 'One active event (past events included)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiEnvelope(EventDto, { message: 'Event' })
  @ApiError(HttpStatus.BAD_REQUEST)
  @ApiError(HttpStatus.NOT_FOUND)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findActive(id);
  }
}

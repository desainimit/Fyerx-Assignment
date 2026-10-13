import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@decorators';
import { EventQueryDto } from '@dtos';
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
  browse(@Query() query: EventQueryDto) {
    return this.eventsService.browse(query);
  }

  // Declared before ':id' so "filters" is not parsed as an event id.
  @Get('filters')
  @ApiOperation({ summary: 'Categories and cities for the filter controls' })
  filters() {
    return this.eventsService.filters();
  }

  @Get(':id')
  @ApiOperation({ summary: 'One active event (past events included)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findActive(id);
  }
}

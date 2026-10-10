import { Controller } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}
}

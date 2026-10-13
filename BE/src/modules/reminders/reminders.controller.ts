import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@decorators';
import { ReminderDto } from '@dtos';
import { RemindersService } from './reminders.service';

@ApiTags('Reminders')
@ApiBearerAuth()
@Controller({ path: 'reminders', version: '1' })
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  @ApiOperation({ summary: 'Ids of events I asked to be reminded about' })
  list(@CurrentUser('id') userId: string) {
    return this.remindersService.list(userId);
  }

  @Put(':eventId')
  @ApiOperation({ summary: 'Turn the reminder for an event on or off' })
  set(
    @CurrentUser('id') userId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: ReminderDto,
  ) {
    return this.remindersService.set(userId, eventId, body);
  }
}

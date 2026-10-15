import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiError, Auth, CurrentUser } from '@decorators';
import { ReminderDto, ReminderListDto } from '@dtos';
import { RemindersService } from './reminders.service';

@ApiTags('Reminders')
@Controller({ path: 'reminders', version: '1' })
@Auth()
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  @ApiOperation({ summary: 'Ids of events I asked to be reminded about' })
  @ApiEnvelope(ReminderListDto, { message: 'Reminders' })
  list(@CurrentUser('id') userId: string) {
    return this.remindersService.list(userId);
  }

  @Put(':eventId')
  @ApiOperation({ summary: 'Turn the reminder for an event on or off' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiEnvelope(ReminderDto, { message: 'Reminder set' })
  @ApiError(HttpStatus.BAD_REQUEST)
  @ApiError(HttpStatus.NOT_FOUND)
  set(
    @CurrentUser('id') userId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: ReminderDto,
  ) {
    return this.remindersService.set(userId, eventId, body);
  }
}

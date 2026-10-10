import { Controller } from '@nestjs/common';
import { RemindersService } from './reminders.service';

@Controller({ path: 'reminders', version: '1' })
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}
}

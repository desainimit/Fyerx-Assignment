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
import { CardDesignDto } from '@dtos';
import { CardDesignService } from './card-design.service';

@ApiTags('Card design')
@ApiBearerAuth()
@Controller({ path: 'card-design', version: '1' })
export class CardDesignController {
  constructor(private readonly cardDesignService: CardDesignService) {}

  @Get(':eventId')
  @ApiOperation({ summary: 'My saved card design for an event, or defaults' })
  get(
    @CurrentUser('id') userId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.cardDesignService.get(userId, eventId);
  }

  @Put(':eventId')
  @ApiOperation({ summary: 'Save the theme and up to 3 stickers' })
  save(
    @CurrentUser('id') userId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: CardDesignDto,
  ) {
    return this.cardDesignService.save(userId, eventId, body);
  }
}

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
import { CardDesignDto } from '@dtos';
import { CardDesignService } from './card-design.service';

@ApiTags('Card design')
@Controller({ path: 'card-design', version: '1' })
@Auth()
export class CardDesignController {
  constructor(private readonly cardDesignService: CardDesignService) {}

  @Get(':eventId')
  @ApiOperation({ summary: 'My saved card design for an event, or defaults' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiEnvelope(CardDesignDto, { message: 'Card design' })
  @ApiError(HttpStatus.BAD_REQUEST)
  @ApiError(HttpStatus.NOT_FOUND)
  get(
    @CurrentUser('id') userId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.cardDesignService.get(userId, eventId);
  }

  @Put(':eventId')
  @ApiOperation({ summary: 'Save the theme and up to 3 stickers' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiEnvelope(CardDesignDto, { message: 'Card design saved' })
  @ApiError(HttpStatus.BAD_REQUEST)
  @ApiError(HttpStatus.NOT_FOUND)
  save(
    @CurrentUser('id') userId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: CardDesignDto,
  ) {
    return this.cardDesignService.save(userId, eventId, body);
  }
}

import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@decorators';
import { FavouritesDto } from '@dtos';
import { FavouritesService } from './favourites.service';

@ApiTags('Favourites')
@ApiBearerAuth()
@Controller({ path: 'favourites', version: '1' })
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get()
  @ApiOperation({ summary: "The current user's favourite category codes" })
  list(@CurrentUser('id') userId: string) {
    return this.favouritesService.list(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace the favourite categories' })
  replace(@CurrentUser('id') userId: string, @Body() body: FavouritesDto) {
    return this.favouritesService.replace(userId, body);
  }
}

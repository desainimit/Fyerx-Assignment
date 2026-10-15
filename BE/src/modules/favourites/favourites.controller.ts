import { Body, Controller, Get, HttpStatus, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiError, Auth, CurrentUser } from '@decorators';
import { FavouritesDto } from '@dtos';
import { FavouritesService } from './favourites.service';

@ApiTags('Favourites')
@Controller({ path: 'favourites', version: '1' })
@Auth()
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get()
  @ApiOperation({ summary: "The current user's favourite category codes" })
  @ApiEnvelope(FavouritesDto, { message: 'Favourite categories' })
  list(@CurrentUser('id') userId: string) {
    return this.favouritesService.list(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace the favourite categories' })
  @ApiEnvelope(FavouritesDto, { message: 'Favourites saved' })
  @ApiError(HttpStatus.BAD_REQUEST, 'Invalid body or unknown category')
  replace(@CurrentUser('id') userId: string, @Body() body: FavouritesDto) {
    return this.favouritesService.replace(userId, body);
  }
}

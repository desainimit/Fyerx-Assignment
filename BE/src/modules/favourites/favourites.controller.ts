import { Controller } from '@nestjs/common';
import { FavouritesService } from './favourites.service';

@Controller({ path: 'favourites', version: '1' })
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}
}

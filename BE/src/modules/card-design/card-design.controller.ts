import { Controller } from '@nestjs/common';
import { CardDesignService } from './card-design.service';

@Controller({ path: 'card-design', version: '1' })
export class CardDesignController {
  constructor(private readonly cardDesignService: CardDesignService) {}
}

import { Module } from '@nestjs/common';
import { CardDesignController } from './card-design.controller';
import { CardDesignService } from './card-design.service';

@Module({ controllers: [CardDesignController], providers: [CardDesignService] })
export class CardDesignModule {}

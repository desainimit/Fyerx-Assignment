import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { EventsModule } from './events/events.module';
import { FavouritesModule } from './favourites/favourites.module';
import { FeedModule } from './feed/feed.module';
import { RemindersModule } from './reminders/reminders.module';
import { CardDesignModule } from './card-design/card-design.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    AdminModule,
    EventsModule,
    FavouritesModule,
    FeedModule,
    RemindersModule,
    CardDesignModule,
  ],
})
export class ModulesModule {}

import { Module } from '@nestjs/common';
import { HealthModule } from '@modules/health/health.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AdminModule } from '@modules/admin/admin.module';
import { EventsModule } from '@modules/events/events.module';
import { FavouritesModule } from '@modules/favourites/favourites.module';
import { FeedModule } from '@modules/feed/feed.module';
import { RemindersModule } from '@modules/reminders/reminders.module';
import { CardDesignModule } from '@modules/card-design/card-design.module';

@Module({
  imports: [
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

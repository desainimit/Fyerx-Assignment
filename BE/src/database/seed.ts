import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { EventModel, UserModel } from '@models';
import { UserRole } from '@app-types/auth.types';
import { hashPassword } from '@utils/password';
import { MigrationsModule } from './migrations.module';
import { SAMPLE_EVENTS, sampleImageUrl, sampleStartsAt } from './seed-data';

// Safe to run repeatedly: the admin password is reset to the configured value
// and sample events are only inserted when no event with that title exists.
async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(MigrationsModule, {
    abortOnError: false,
  });
  const logger = new Logger('Seed');
  try {
    const config = app.get(ConfigService);
    const sequelize = app.get<Sequelize>(getConnectionToken());
    const email = config.getOrThrow<string>('ADMIN_EMAIL');
    const passwordHash = await hashPassword(
      config.getOrThrow<string>('ADMIN_PASSWORD'),
    );
    const now = new Date();

    await sequelize.transaction(async (transaction) => {
      const admin = await UserModel.findOne({
        where: { email: email.toLowerCase() },
        transaction,
      });
      if (admin) {
        await admin.update(
          { passwordHash, role: UserRole.Admin },
          { transaction },
        );
      } else {
        await UserModel.create(
          { email, passwordHash, role: UserRole.Admin },
          { transaction },
        );
      }

      let inserted = 0;
      for (const sample of SAMPLE_EVENTS) {
        const exists = await EventModel.count({
          where: { title: sample.title },
          transaction,
        });
        if (exists) continue;
        await EventModel.create(
          {
            title: sample.title,
            categoryCode: sample.categoryCode,
            city: sample.city,
            startsAt: sampleStartsAt(sample, now),
            pricePaise: sample.priceRupees * 100,
            description: sample.description,
            imageUrl: sampleImageUrl(sample),
            isActive: sample.isActive,
          },
          { transaction },
        );
        inserted += 1;
      }
      logger.log(`Admin ${email} ready; inserted ${inserted} sample event(s)`);
    });
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void seed().catch((error: unknown) => {
    Logger.error(
      error instanceof Error ? error.message : 'Seed failed',
      undefined,
      'Seed',
    );
    process.exitCode = 1;
  });
}

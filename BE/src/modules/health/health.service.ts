import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ApiResult, HealthDataDto } from '@dtos';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async check(): Promise<ApiResult<HealthDataDto>> {
    try {
      await this.sequelize.authenticate();
    } catch {
      throw new ServiceUnavailableException('Database connection unavailable');
    }
    return {
      message: 'Service is healthy',
      data: { service: 'community-events-board', database: 'up' },
    };
  }
}

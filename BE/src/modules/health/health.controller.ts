import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthDataDto } from '@dtos';
import { HealthService } from './health.service';
import { ApiEnvelope, ApiError, Public } from '@decorators';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Check backend and PostgreSQL connectivity' })
  @ApiEnvelope(HealthDataDto, { message: 'Service is healthy' })
  @ApiError(HttpStatus.SERVICE_UNAVAILABLE)
  check() {
    return this.healthService.check();
  }
}

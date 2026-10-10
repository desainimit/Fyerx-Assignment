import { ApiProperty } from '@nestjs/swagger';

export class HealthDataDto {
  @ApiProperty({ example: 'community-events-board' })
  declare service: string;

  @ApiProperty({ example: 'up' })
  declare database: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: true })
  declare status: boolean;

  @ApiProperty({ example: 'Service is healthy' })
  declare message: string;

  @ApiProperty({ type: HealthDataDto })
  declare data: HealthDataDto;
}

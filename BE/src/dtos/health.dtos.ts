import { ApiProperty } from '@nestjs/swagger';

export class HealthDataDto {
  @ApiProperty({ example: 'community-events-board' })
  declare service: string;

  @ApiProperty({ example: 'up' })
  declare database: string;
}

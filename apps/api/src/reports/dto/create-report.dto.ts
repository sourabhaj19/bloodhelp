import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ description: 'Reported user id' })
  @IsUUID()
  reportedUserId!: string;

  @ApiProperty({ description: 'Report reason id' })
  @IsUUID()
  reasonId!: string;

  @ApiPropertyOptional({ example: 'Suspicious profile with fake photo' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'] })
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminComment?: string;
}

import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppreciationDto {
  @ApiProperty({ description: 'Receiver user id' })
  @IsUUID()
  receiverUserId!: string;

  @ApiPropertyOptional({ example: 'Thank you for being a hero!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

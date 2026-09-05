import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NOTIFICATION_TYPE_VALUES } from '../notification-types';

export class CreateEmailTemplateDto {
  @ApiProperty({ example: 'PASSWORD_RESET' })
  @IsString() @MinLength(2) @MaxLength(50) @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @ApiProperty({ example: 'Password reset link' })
  @IsString() @MinLength(2) @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Reset your BloodHelp password' })
  @IsString() @MinLength(2) @MaxLength(255)
  subject!: string;

  @ApiProperty({ description: 'HTML body, {{placeholders}} supported' })
  @IsString() @MinLength(2)
  htmlBody!: string;

  @ApiPropertyOptional({ description: 'Plain-text fallback' })
  @IsOptional() @IsString()
  textBody?: string;

  @ApiPropertyOptional({ description: 'Map to an in-app notification type (one template per type)' })
  @IsOptional() @IsString() @IsIn(NOTIFICATION_TYPE_VALUES)
  notificationType?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(255)
  subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2)
  htmlBody?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()
  textBody?: string;
  @ApiPropertyOptional({ description: 'Map to a notification type, or null to unmap' })
  @IsOptional() @IsString() @IsIn(NOTIFICATION_TYPE_VALUES)
  notificationType?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  active?: boolean;
}

export class TestEmailTemplateDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsString() @MinLength(3) @MaxLength(254)
  to!: string;
}

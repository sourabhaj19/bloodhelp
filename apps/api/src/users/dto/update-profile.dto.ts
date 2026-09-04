import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  MaxLength,
  MinLength,
  Matches,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Changing email triggers re-verification flow' })
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() countryCodeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^(\d{10}|\+[1-9]\d{7,14})$/) mobile?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() bloodGroupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) pinCode?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
}

export class UpdateStatusDto {
  @ApiPropertyOptional({ example: true })
  active!: boolean;
}

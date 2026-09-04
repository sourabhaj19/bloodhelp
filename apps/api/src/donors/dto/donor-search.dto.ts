import { IsOptional, IsString, IsUUID, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DonorSearchDto {
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pinCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() bloodGroupId?: string;

  // active default true; optional filter
  @ApiPropertyOptional({ default: true }) @IsOptional() @Type(() => String) @IsString() active?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @ApiPropertyOptional({ enum: ['5', '10', '25', '50', '100', 'any'] }) @IsOptional() @IsString() radiusKm?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsNumber() pageSize?: number;

  @ApiPropertyOptional({ enum: ['distance', 'recent', 'name'] }) @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

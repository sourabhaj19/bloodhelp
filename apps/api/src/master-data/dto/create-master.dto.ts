import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBloodGroupDto {
  @ApiProperty({ example: 'A+' })
  @IsString() @MinLength(1) @MaxLength(10)
  code!: string;

  @ApiProperty({ example: 'A Positive' })
  @IsString() @MinLength(1) @MaxLength(50)
  label!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdateBloodGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(50)
  label?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  active?: boolean;
}

export class CreateCountryDto {
  @ApiProperty({ example: 'India' }) @IsString() @MinLength(1) @MaxLength(100)
  name!: string;
  @ApiProperty({ example: 'IN' }) @IsString() @MinLength(2) @MaxLength(2)
  isoCode2!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCountryDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(2) isoCode2?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateStateDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateStateDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateCityDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCityDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateCountryCodeDto {
  @ApiProperty({ example: '+91' }) @IsString() @MinLength(1) @MaxLength(10) dialCode!: string;
  @ApiProperty({ example: 'India (+91)' }) @IsString() @MinLength(1) @MaxLength(100) label!: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCountryCodeDto {
  @IsOptional() @IsString() dialCode?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: '1995-06-15', description: 'ISO date YYYY-MM-DD' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail() @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ example: 'uuid-country-code-id', description: 'Resolved automatically from countryId when omitted' })
  @IsOptional()
  @IsString() // allow UUID string, validated further in service against DB
  countryCodeId?: string;

  @ApiProperty({ example: '9876543210', description: '10 digit mobile number (no country prefix — dial code is derived from country)' })
  @IsString() @Matches(/^\d{10}$/, { message: 'mobile must be a 10 digit number' })
  mobile!: string;

  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsString() @MinLength(8) @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'uuid-blood-group-id' })
  @IsString()
  bloodGroupId!: string;

  @ApiProperty({ example: 'uuid-country-id' })
  @IsString()
  countryId!: string;

  @ApiProperty({ example: 'uuid-state-id' })
  @IsString()
  stateId!: string;

  @ApiProperty({ example: 'uuid-city-id' })
  @IsString()
  cityId!: string;

  @ApiProperty({ example: 'Andheri East' })
  @IsString() @MaxLength(200)
  area!: string;

  @ApiProperty({ example: '400069' })
  @IsString() @Matches(/^[0-9]{6}$/, { message: 'pinCode must be a 6 digit number' })
  pinCode!: string;

  @ApiProperty({ example: 19.0760 })
  @Type(() => Number)
  @IsNumber({}, { message: 'latitude must be a number' })
  @Min(-90) @Max(90)
  latitude!: number;

  @ApiProperty({ example: 72.8777 })
  @Type(() => Number)
  @IsNumber({}, { message: 'longitude must be a number' })
  @Min(-180) @Max(180)
  longitude!: number;
}

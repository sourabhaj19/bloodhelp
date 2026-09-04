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

  @ApiProperty({ example: 'uuid-country-code-id' })
  @IsString() // allow UUID string, validated further in service against DB
  countryCodeId!: string;

  @ApiProperty({ example: '9876543210', description: '10 digit mobile or E.164 (+919876543210)' })
  @IsString() @Matches(/^(\d{10}|\+[1-9]\d{7,14})$/, { message: 'mobile must be 10 digit number or valid E.164 format' })
  mobile!: string;

  @ApiProperty({ example: 'Str0ng!Pass123' })
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
  @IsString() @MaxLength(20)
  pinCode!: string;

  @ApiProperty({ example: 19.0760 })
  @Type(() => Number)
  @IsNumber({}, { message: 'latitude must be a number' })
  latitude!: number;

  @ApiProperty({ example: 72.8777 })
  @Type(() => Number)
  @IsNumber({}, { message: 'longitude must be a number' })
  longitude!: number;
}

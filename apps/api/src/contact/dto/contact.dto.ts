import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Alex Kumar' })
  @IsString() @MinLength(2) @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail() @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'General question' })
  @IsString() @MinLength(2) @MaxLength(150)
  subject!: string;

  @ApiProperty({ example: 'How can I organize a donation camp?' })
  @IsString() @MinLength(10) @MaxLength(2000)
  message!: string;
}

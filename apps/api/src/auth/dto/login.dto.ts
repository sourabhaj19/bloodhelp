import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com or +919876543210', description: 'email or mobile (E.164)' })
  @IsString() @MinLength(3) @MaxLength(254)
  identifier!: string;

  @ApiProperty({ example: 'Str0ng!Pass123' })
  @IsString() @MinLength(1) @MaxLength(128)
  password!: string;
}

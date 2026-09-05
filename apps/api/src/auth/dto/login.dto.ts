import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com or +919876543210', description: 'email or mobile (E.164)' })
  @IsString() @MinLength(3) @MaxLength(254)
  identifier!: string;

  @ApiProperty({ example: 'Str0ng!Pass123' })
  @IsString() @MinLength(1) @MaxLength(128)
  password!: string;

  @ApiProperty({ example: false, required: false, description: 'Keep me logged in: long-lived refresh token + persistent cookie. Defaults to a short session.' })
  @IsOptional() @IsBoolean()
  rememberMe?: boolean;
}

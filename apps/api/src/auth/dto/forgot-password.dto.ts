import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail() @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'raw-token-hex-from-email' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NewStr0ng!Pass123' })
  @IsString() @MinLength(1) @MaxLength(128)
  newPassword!: string;

  @ApiProperty({ example: 'NewStr0ng!Pass123' })
  @IsString() @MinLength(1) @MaxLength(128)
  confirmPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldStr0ng!Pass123' })
  @IsString() @MinLength(1) @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: 'NewStr0ng!Pass123' })
  @IsString() @MinLength(8) @MaxLength(128)
  newPassword!: string;

  @ApiProperty({ example: 'NewStr0ng!Pass123' })
  @IsString() @MinLength(1) @MaxLength(128)
  confirmPassword!: string;
}

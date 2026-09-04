import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail() @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'raw-token-hex-from-email' })
  token!: string;

  @ApiProperty({ example: 'NewStr0ng!Pass123' })
  newPassword!: string;

  @ApiProperty({ example: 'NewStr0ng!Pass123' })
  confirmPassword!: string;
}

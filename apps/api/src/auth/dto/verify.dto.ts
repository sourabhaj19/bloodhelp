import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'raw-token-hex-from-email' })
  @IsString() @MinLength(10) @MaxLength(128)
  token!: string;
}

export class VerifyMobileDto {
  @ApiProperty({ example: '482913', description: '6-digit OTP sent by SMS' })
  @IsString() @Matches(/^\d{6}$/)
  otp!: string;
}

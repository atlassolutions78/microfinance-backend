import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@microfinance.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  expiresAt: string;

  @ApiProperty()
  user: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string;
    role: string;
    branchId: string | null;
    branchName: string | null;
    branchType: string | null;
    scope: 'branch' | 'global';
  };
}

export class SetPasswordDto {
  @ApiProperty({ description: 'The secure invitation token from the email' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'The new password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

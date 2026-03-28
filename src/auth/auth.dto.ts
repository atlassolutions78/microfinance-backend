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

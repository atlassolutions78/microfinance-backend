import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class AuthResponseDto {
  accessToken: string;
  expiresAt: string;
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

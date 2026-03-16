import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { UserRole } from './user.enums';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName: string;

  @IsEnum(UserRole)
  role: UserRole;
}

export class ChangeRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

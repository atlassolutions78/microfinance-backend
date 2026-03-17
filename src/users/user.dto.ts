import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { UserRole } from './user.enums';

export class CreateUserDto {
  @IsUUID()
  @IsOptional()
  branchId: string | null;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  middleName: string | null;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}

export class ChangeRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

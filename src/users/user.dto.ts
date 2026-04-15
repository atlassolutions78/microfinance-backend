import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from './user.enums';

export class CreateUserDto {
  @ApiPropertyOptional({
    description:
      'UUID of the branch this user belongs to. Null for HQ/Admin users.',
    example: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  branchId: string | null;

  @ApiProperty({
    description: 'First name (2–100 characters)',
    example: 'Jean',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiPropertyOptional({
    description: 'Middle name (optional, max 100 characters)',
    example: 'Pierre',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  middleName: string | null;

  @ApiProperty({
    description: 'Last name (2–100 characters)',
    example: 'Mutombo',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Staff email address',
    example: 'jean.mutombo@microfinance.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Initial password (minimum 8 characters)',
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Role assigned to this user',
    example: UserRole.TELLER,
  })
  @IsEnum(UserRole)
  role: UserRole;
}

export class ChangeRoleDto {
  @ApiProperty({
    enum: UserRole,
    description: 'New role to assign to the user',
    example: UserRole.LOAN_OFFICER,
  })
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsUUID()
  @IsOptional()
  branchId?: string | null;
}

export class UserFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isActive?: boolean;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

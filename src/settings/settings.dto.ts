import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsUUID,
  MinLength,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchType } from './branch.enums';
import { UserRole } from '../users/user.enums';

export class CreateBranchDto {
  @ApiProperty({
    description: 'Human-readable branch name',
    example: 'Kinshasa Main Branch',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique short code for the branch',
    example: 'KIN-001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    enum: BranchType,
    description: 'HEAD for headquarters, NORMAL for regular branch',
    example: BranchType.NORMAL,
  })
  @IsEnum(BranchType)
  type: BranchType;

  @ApiProperty({
    description: 'Physical address of the branch',
    example: 'Avenue du Commerce 14, Gombe, Kinshasa',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({
    description: 'Contact phone number for the branch',
    example: '+243812345678',
  })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class UpdateBranchDto {
  @ApiPropertyOptional({
    description: 'Updated branch name',
    example: 'Kinshasa Central Branch',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated physical address',
    example: 'Boulevard du 30 Juin 22, Gombe, Kinshasa',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Updated contact phone number',
    example: '+243898765432',
  })
  @IsString()
  @IsOptional()
  phone?: string;
}

// ─── User DTOs ────────────────────────────────────────────────────────────────

export class CreateSettingsUserDto {
  @ApiPropertyOptional({ description: 'Branch UUID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiPropertyOptional({ example: 'Pierre' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  middleName?: string | null;

  @ApiProperty({ example: 'Mutombo' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'jean@microfinance.cd' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Temporary password, min 8 chars' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateSettingsUserDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Branch UUID or null to unassign' })
  @IsUUID()
  @IsOptional()
  branchId?: string | null;
}

export class UserFiltersQuery {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'true or false' })
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

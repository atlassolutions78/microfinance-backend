import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType, AccountCurrency } from './account.enums';

export class OpenAccountDto {
  @ApiProperty({
    description: 'UUID of the client to open the account for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    enum: AccountType,
    description:
      'SAVINGS or CHECKING for individual clients; BUSINESS_CURRENT for organization clients',
    example: AccountType.SAVINGS,
  })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({
    enum: AccountCurrency,
    description: 'USD or FC',
    example: AccountCurrency.FC,
  })
  @IsEnum(AccountCurrency)
  currency: AccountCurrency;
}

export class GetAccountsQueryDto {
  @ApiPropertyOptional({
    description: 'Search by account number or client name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by account status (e.g. ACTIVE, PENDING)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by account type (e.g. SAVINGS, CHECKING)',
  })
  @IsOptional()
  @IsString()
  type?: string;

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

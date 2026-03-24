import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from './transaction.enums';

export class DepositDto {
  @ApiProperty({
    description: 'UUID of the account to deposit into',
    example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  accountId: string;

  @ApiProperty({
    description: 'UUID of the branch processing the deposit',
    example: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  branchId: string;

  @ApiProperty({
    description: 'Amount to deposit (minimum 0.01)',
    minimum: 0.01,
    example: 50000,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    enum: Currency,
    description: 'Currency of the transaction',
    example: Currency.FC,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Optional description or reference note',
    example: 'Monthly salary deposit',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'UUID of the staff member performing the deposit',
    example: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  performedBy: string;
}

export class WithdrawalDto {
  @ApiProperty({
    description: 'UUID of the account to withdraw from',
    example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  accountId: string;

  @ApiProperty({
    description: 'UUID of the branch processing the withdrawal',
    example: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  branchId: string;

  @ApiProperty({
    description: 'Amount to withdraw (minimum 0.01)',
    minimum: 0.01,
    example: 20000,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    enum: Currency,
    description: 'Currency of the transaction',
    example: Currency.FC,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Optional description or reference note',
    example: 'School fees payment',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'UUID of the staff member performing the withdrawal',
    example: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  performedBy: string;

  @ApiPropertyOptional({
    description: 'Pass BUSINESS to trigger the dual-signature policy check',
    example: 'BUSINESS',
  })
  @IsOptional()
  @IsString()
  accountType?: string;
}

export class InternalTransferDto {
  @ApiProperty({
    description: 'UUID of the source account',
    example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  sourceAccountId: string;

  @ApiProperty({
    description: 'UUID of the destination account',
    example: 'c2b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  destinationAccountId: string;

  @ApiProperty({
    description: 'UUID of the branch processing the transfer',
    example: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  branchId: string;

  @ApiProperty({
    description: 'Amount to transfer (minimum 0.01)',
    minimum: 0.01,
    example: 10000,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    enum: Currency,
    description: 'Currency of the transaction',
    example: Currency.USD,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Optional description or reference note',
    example: 'Transfer to savings account',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'UUID of the staff member performing the transfer',
    example: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  performedBy: string;
}

export class ExternalTransferDto {
  @ApiProperty({
    description: 'UUID of the source account',
    example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  sourceAccountId: string;

  @ApiProperty({
    description: 'UUID of the branch processing the transfer',
    example: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  branchId: string;

  @ApiProperty({
    description: 'Amount to transfer (minimum 0.01)',
    minimum: 0.01,
    example: 200,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    enum: Currency,
    description: 'Currency of the transaction',
    example: Currency.USD,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Full name of the external recipient (minimum 2 characters)',
    example: 'Jean-Pierre Kabila',
  })
  @IsString()
  @MinLength(2)
  recipientName: string;

  @ApiPropertyOptional({
    description: 'External claim or reference number',
    example: 'REF-20240315-001',
  })
  @IsOptional()
  @IsString()
  claimReference?: string;

  @ApiPropertyOptional({
    description: 'Optional description or reference note',
    example: 'Payment for goods delivered',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'UUID of the staff member performing the transfer',
    example: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  performedBy: string;
}

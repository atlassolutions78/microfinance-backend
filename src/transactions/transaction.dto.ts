import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Currency } from './transaction.enums';

export class DepositDto {
  @IsUUID()
  accountId: string;

  @IsUUID()
  branchId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  performedBy: string;
}

export class WithdrawalDto {
  @IsUUID()
  accountId: string;

  @IsUUID()
  branchId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  performedBy: string;

  // Pass 'BUSINESS' to trigger the signature policy check (story 3.3).
  @IsOptional()
  @IsString()
  accountType?: string;
}

export class InternalTransferDto {
  @IsUUID()
  sourceAccountId: string;

  @IsUUID()
  destinationAccountId: string;

  @IsUUID()
  branchId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  performedBy: string;
}

export class ExternalTransferDto {
  @IsUUID()
  sourceAccountId: string;

  @IsUUID()
  branchId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @MinLength(2)
  recipientName: string;

  @IsOptional()
  @IsString()
  claimReference?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  performedBy: string;
}

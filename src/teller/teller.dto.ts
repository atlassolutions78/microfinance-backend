import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Currency } from './teller.enums';

// ── Session DTOs ───────────────────────────────────────────────────────────────

export class RequestSessionDto {
  @IsNumber()
  @Min(0)
  requestedAmountFC: number;

  @IsNumber()
  @Min(0)
  requestedAmountUSD: number;
}

export class DenominationEntryDto {
  /** Face value of the note (e.g. 5000 for a 5,000 FC note). */
  @IsInt()
  @IsPositive()
  denomination: number;

  /** Number of notes of this denomination. */
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class ApproveSessionDto {
  @IsNumber()
  @Min(0)
  approvedAmountFC: number;

  @IsNumber()
  @Min(0)
  approvedAmountUSD: number;

  /** Breakdown of FC notes handed to the teller. Optional but recommended. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationEntryDto)
  @IsOptional()
  denominationsFC?: DenominationEntryDto[];

  /** Breakdown of USD notes handed to the teller. Optional but recommended. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationEntryDto)
  @IsOptional()
  denominationsUSD?: DenominationEntryDto[];
}

export class SubmitEodDto {
  @IsNumber()
  @Min(0)
  declaredClosingCashFC: number;

  @IsNumber()
  @Min(0)
  declaredClosingCashUSD: number;

  /** Breakdown of FC notes counted in the drawer at close. Optional but recommended. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationEntryDto)
  @IsOptional()
  denominationsFC?: DenominationEntryDto[];

  /** Breakdown of USD notes counted in the drawer at close. Optional but recommended. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationEntryDto)
  @IsOptional()
  denominationsUSD?: DenominationEntryDto[];
}

// ── Transaction DTOs ───────────────────────────────────────────────────────────

export class TellerDepositDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @IsOptional()
  description?: string;
}

export class TellerWithdrawalDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @IsOptional()
  description?: string;
}

export class TellerTransferDto {
  @IsUUID()
  sourceAccountId: string;

  @IsUUID()
  destinationAccountId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @IsOptional()
  description?: string;
}

// ── Preview DTOs ──────────────────────────────────────────────────────────────

export class WithdrawalPreviewQuery {
  @IsUUID()
  accountId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  currency: Currency;
}

export class DepositPreviewQuery {
  @IsUUID()
  accountId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  currency: Currency;
}

export class TransferPreviewQuery {
  @IsUUID()
  sourceAccountId: string;

  @IsUUID()
  destinationAccountId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  currency: Currency;
}

// ── Query DTOs ─────────────────────────────────────────────────────────────────

export class ListSessionsQueryDto {
  /** Filter by teller ID (manager use). */
  @IsUUID()
  @IsOptional()
  tellerId?: string;

  /** Filter by date (YYYY-MM-DD). */
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

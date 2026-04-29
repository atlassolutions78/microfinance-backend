import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Currency } from '../teller/teller.enums';
import { IdType } from '../clients/client.enums';

export class SendRemittanceDto {
  /** The sending teller's current open session. */
  @IsUUID()
  sessionId: string;

  /** Branch where the recipient will collect the cash. */
  @IsUUID()
  receivingBranchId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @MinLength(2)
  recipientName: string;

  @IsEnum(IdType)
  recipientIdType: IdType;

  /** National ID, passport, or other government-issued ID number. */
  @IsString()
  @MinLength(2)
  recipientIdNumber: string;

  @IsString()
  @IsOptional()
  recipientPhone?: string;
}

export class PayoutRemittanceDto {
  /** The receiving teller's current open session. */
  @IsUUID()
  payoutSessionId: string;
}

export class SendRemittancePreviewQuery {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  receivingBranchId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  currency: Currency;
}

export class PayoutRemittancePreviewQuery {
  @IsUUID()
  payoutSessionId: string;
}

export class CancelRemittanceDto {
  /** The sending teller's current open session (needed to return the cash). */
  @IsUUID()
  sessionId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class GetRemittancesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  limit?: number;
}

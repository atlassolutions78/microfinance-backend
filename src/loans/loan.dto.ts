import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LoanCurrency,
  LoanDocumentType,
  LoanStatus,
  LoanType,
} from './loan.enums';
import { ApiProperty } from '@nestjs/swagger';

// ---------------------------------------------------------------------------
// Loan application
// ---------------------------------------------------------------------------

export class LoanDocumentInputDto {
  @IsEnum(LoanDocumentType)
  documentType!: LoanDocumentType;

  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;
}

export class ApplyLoanDto {
  @IsUUID()
  clientId!: string;

  /** Account to receive the disbursement. Must belong to the client. */
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    enum: LoanType,
    description: 'Type of loan',
    example: LoanType.PERSONAL_LOAN,
  })
  @IsEnum(LoanType)
  type: LoanType = LoanType.SALARY_ADVANCE;

  @IsEnum(LoanCurrency)
  currency!: LoanCurrency;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  principalAmount!: number;

  /**
   * Required for PERSONAL_LOAN (10 or 12 months).
   * Ignored for SALARY_ADVANCE (fixed 1 month) and OVERDRAFT (fixed 3 months).
   */
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  termMonths?: number;

  @IsString()
  @IsOptional()
  purpose?: string;

  /** Supporting documents: MOU, Commitment Letter, Request Letter */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanDocumentInputDto)
  documents!: LoanDocumentInputDto[];
}

// ---------------------------------------------------------------------------
// Review actions
// ---------------------------------------------------------------------------

export class DisburseDto {
  /** Override the disbursement account. Must belong to the same client. Optional — defaults to the account set at application. */
  @IsUUID()
  @IsOptional()
  accountId?: string;
}

export class RejectLoanDto {
  @ApiProperty({
    description: 'Reason for rejection (minimum 5 characters)',
    example: 'Insufficient collateral provided by the applicant',
  })
  @IsString()
  @MinLength(5)
  reason!: string;
}

// ---------------------------------------------------------------------------
// Repayment recording
// ---------------------------------------------------------------------------

export class RecordPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  /** Target a specific installment. If omitted, the next unpaid installment is used. */
  @IsUUID()
  @IsOptional()
  scheduleId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// ---------------------------------------------------------------------------
// Query filters (for GET /loans)
// ---------------------------------------------------------------------------

export class QueryLoansDto {
  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;

  @IsEnum(LoanType)
  @IsOptional()
  type?: LoanType;

  @IsUUID()
  @IsOptional()
  clientId?: string;
}

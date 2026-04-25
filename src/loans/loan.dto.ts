import {
  IsArray,
  IsEnum,
  IsIn,
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
  RepaymentStatus,
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
  @IsOptional()
  @IsString()
  search?: string;

  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;

  @IsEnum(LoanType)
  @IsOptional()
  type?: LoanType;

  @IsUUID()
  @IsOptional()
  clientId?: string;

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

// ---------------------------------------------------------------------------
// Query filters (for GET /loans/applications)
// ---------------------------------------------------------------------------

export class LoanApplicationsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([LoanStatus.PENDING, LoanStatus.APPROVED])
  status?: LoanStatus.PENDING | LoanStatus.APPROVED;

  @IsOptional()
  @IsEnum(LoanType)
  type?: LoanType;

  @IsOptional()
  @IsEnum(LoanCurrency)
  currency?: LoanCurrency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

// ---------------------------------------------------------------------------
// Query filters (for GET /loans/active)
// ---------------------------------------------------------------------------

export class ActiveLoansQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LoanType)
  type?: LoanType;

  @IsOptional()
  @IsEnum(LoanCurrency)
  currency?: LoanCurrency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

// ---------------------------------------------------------------------------
// Query filters (for GET /loans/collections)
// ---------------------------------------------------------------------------

export class CollectionsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([RepaymentStatus.LATE, RepaymentStatus.OVERDUE])
  repaymentStatus?: RepaymentStatus.LATE | RepaymentStatus.OVERDUE;

  @IsOptional()
  @IsEnum(LoanCurrency)
  currency?: LoanCurrency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

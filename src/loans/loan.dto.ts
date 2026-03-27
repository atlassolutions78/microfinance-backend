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
import { ApiProperty } from '@nestjs/swagger';
import { LoanStatus, LoanType } from './loan.enums';
import { Type } from 'class-transformer';

export class CreateLoanDto {
  @ApiProperty({
    description: 'UUID of the member applying for the loan',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: 'Loan principal amount (minimum 10,000)',
    minimum: 10000,
    example: 500000,
  })
  @IsNumber()
  @Min(10_000)
  amount: number;

  @ApiProperty({
    description: 'Annual interest rate as a decimal, e.g. 0.15 for 15%',
    minimum: 0.01,
    maximum: 1,
    example: 0.15,
  })
  @IsNumber()
  @Min(0.01)
  @Max(1)
  interestRate: number;

  @ApiProperty({
    description: 'Loan term in months (1–60)',
    minimum: 1,
    maximum: 60,
    example: 12,
  })
  @IsNumber()
  @Min(1)
  @Max(60)
  termMonths: number;

  @ApiProperty({
    enum: LoanType,
    description: 'Type of loan',
    example: LoanType.SALARY_ADVANCE,
  })
  @IsEnum(LoanType)
  type: LoanType;

  @ApiProperty({
    description: 'Purpose of the loan (minimum 10 characters)',
    example: 'Purchase of agricultural equipment for farming season',
  })
  @IsString()
  @IsOptional()
  purpose?: string;

  /** Supporting documents: MOU, Commitment Letter, Request Letter */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanDocumentInputDto)
  documents: LoanDocumentInputDto[];
}

export class ApproveLoanDto {
  @ApiProperty({
    description: 'UUID of the staff member approving the loan',
    example: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  approverId: string;
}

export class LoanDocumentInputDto {
  @ApiProperty({
    description: 'Document type (MOU, Commitment Letter, Request Letter, etc.)',
    example: 'MOU',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Base64-encoded document content or file URL',
    example: 'data:application/pdf;base64,...',
  })
  @IsString()
  content: string;
}

export class RejectLoanDto {
  @ApiProperty({
    description: 'Reason for rejection (minimum 5 characters)',
    example: 'Insufficient collateral provided by the applicant',
  })
  @IsString()
  @MinLength(5)
  reason: string;
}

// ---------------------------------------------------------------------------
// Repayment recording
// ---------------------------------------------------------------------------

export class RecordPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

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


import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LoanType } from './loan.enums';

export class CreateLoanDto {
  @ApiProperty({
    description: 'UUID of the member applying for the loan',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  memberId: string;

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
    example: LoanType.INDIVIDUAL,
  })
  @IsEnum(LoanType)
  type: LoanType;

  @ApiProperty({
    description: 'Purpose of the loan (minimum 10 characters)',
    example: 'Purchase of agricultural equipment for farming season',
  })
  @IsString()
  @MinLength(10)
  purpose: string;
}

export class ApproveLoanDto {
  @ApiProperty({
    description: 'UUID of the staff member approving the loan',
    example: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  approverId: string;
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

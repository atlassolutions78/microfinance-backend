import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { LoanType } from './loan.enums';

export class CreateLoanDto {
  @IsUUID()
  memberId: string;

  @IsNumber()
  @Min(10_000)
  amount: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  interestRate: number;

  @IsNumber()
  @Min(1)
  @Max(60)
  termMonths: number;

  @IsEnum(LoanType)
  type: LoanType;

  @IsString()
  @MinLength(10)
  purpose: string;
}

export class ApproveLoanDto {
  @IsUUID()
  approverId: string;
}

export class RejectLoanDto {
  @IsString()
  @MinLength(5)
  reason: string;
}

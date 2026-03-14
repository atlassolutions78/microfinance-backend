import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoanRepository } from './loan.repository';
import { LoanPolicy } from './loan.policy';
import { LoanModel } from './loan.model';
import { LoanStatus } from './loan.enums';
import { CreateLoanDto, ApproveLoanDto, RejectLoanDto } from './loan.dto';

/**
 * Orchestrates loan use cases.
 *
 * The service does not contain business rules — it coordinates:
 *   1. Fetch what is needed
 *   2. Check policy (external eligibility rules)
 *   3. Tell the domain model to do something (which enforces its own rules)
 *   4. Persist the result
 */
@Injectable()
export class LoanService {
  constructor(private readonly loanRepository: LoanRepository) {}

  async apply(dto: CreateLoanDto): Promise<LoanModel> {
    const activeCount = await this.loanRepository.countActiveByMember(
      dto.memberId,
    );

    LoanPolicy.assertCanApply(activeCount);
    LoanPolicy.assertAmount(dto.amount, dto.type);

    const loan = new LoanModel({
      id: randomUUID(),
      memberId: dto.memberId,
      amount: dto.amount,
      interestRate: dto.interestRate,
      termMonths: dto.termMonths,
      type: dto.type,
      purpose: dto.purpose,
      status: LoanStatus.PENDING,
      createdAt: new Date(),
    });

    await this.loanRepository.save(loan);
    return loan;
  }

  async approve(loanId: string, dto: ApproveLoanDto): Promise<LoanModel> {
    const loan = await this.findOrFail(loanId);
    loan.approve(dto.approverId); // model enforces: must be PENDING
    await this.loanRepository.save(loan);
    return loan;
  }

  async reject(loanId: string, dto: RejectLoanDto): Promise<LoanModel> {
    const loan = await this.findOrFail(loanId);
    loan.reject(dto.reason); // model enforces: must be PENDING
    await this.loanRepository.save(loan);
    return loan;
  }

  async disburse(loanId: string): Promise<LoanModel> {
    const loan = await this.findOrFail(loanId);
    loan.disburse(); // model enforces: must be APPROVED
    await this.loanRepository.save(loan);
    return loan;
  }

  async close(loanId: string): Promise<LoanModel> {
    const loan = await this.findOrFail(loanId);
    loan.close(); // model enforces: must be ACTIVE
    await this.loanRepository.save(loan);
    return loan;
  }

  async findById(loanId: string): Promise<LoanModel> {
    return this.findOrFail(loanId);
  }

  async findAll(): Promise<LoanModel[]> {
    return this.loanRepository.findAll();
  }

  private async findOrFail(loanId: string): Promise<LoanModel> {
    const loan = await this.loanRepository.findById(loanId);
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found`);
    return loan;
  }
}

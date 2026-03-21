import {
  LoanCurrency,
  LoanDocumentType,
  LoanStatus,
  LoanType,
  RepaymentStatus,
} from './loan.enums';
import {
  LoanDocument,
  LoanModel,
  LoanModelProps,
  LoanPayment,
  LoanPenalty,
  RepaymentScheduleItem,
} from './loan.model';
import {
  LoanDocumentEntity,
  LoanEntity,
  LoanPaymentEntity,
  LoanPenaltyEntity,
  RepaymentScheduleEntity,
} from './loan.entity';

// ---------------------------------------------------------------------------
// LoanMapper
// The only file that knows about both the DB entity shape and the domain model.
// If a column is renamed, fix it here — nowhere else.
// ---------------------------------------------------------------------------

export class LoanMapper {
  // --- Loan ---

  static toDomain(e: LoanEntity): LoanModel {
    const props: LoanModelProps = {
      id: e.id,
      loanNumber: e.loan_number,
      clientId: e.client_id,
      accountId: e.account_id,
      branchId: e.branch_id,
      type: e.type as LoanType,
      currency: e.currency as LoanCurrency,
      principalAmount: Number(e.principal_amount),
      outstandingBalance: Number(e.outstanding_balance),
      interestRate: Number(e.interest_rate),
      termMonths: e.term_months,
      formFee: Number(e.form_fee),
      purpose: e.purpose ?? undefined,
      status: e.status as LoanStatus,
      rejectionReason: e.rejection_reason ?? undefined,
      appliedBy: e.applied_by,
      reviewedBy: e.reviewed_by ?? undefined,
      reviewedAt: e.reviewed_at ?? undefined,
      disbursedAt: e.disbursed_at ?? undefined,
      disbursedBy: e.disbursed_by ?? undefined,
      closedAt: e.closed_at ?? undefined,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    };
    return new LoanModel(props);
  }

  static toEntity(m: LoanModel): LoanEntity {
    const e = new LoanEntity();
    e.id = m.id;
    e.loan_number = m.loanNumber;
    e.client_id = m.clientId;
    e.account_id = m.accountId;
    e.branch_id = m.branchId;
    e.type = m.type;
    e.currency = m.currency;
    e.principal_amount = String(m.principalAmount);
    e.outstanding_balance = String(m.outstandingBalance);
    e.interest_rate = String(m.interestRate);
    e.term_months = m.termMonths;
    e.form_fee = String(m.formFee);
    e.purpose = m.purpose ?? null;
    e.status = m.status;
    e.rejection_reason = m.rejectionReason ?? null;
    e.applied_by = m.appliedBy;
    e.reviewed_by = m.reviewedBy ?? null;
    e.reviewed_at = m.reviewedAt ?? null;
    e.disbursed_at = m.disbursedAt ?? null;
    e.disbursed_by = m.disbursedBy ?? null;
    e.closed_at = m.closedAt ?? null;
    e.created_at = m.createdAt;
    e.updated_at = m.updatedAt;
    return e;
  }

  // --- RepaymentScheduleItem ---

  static scheduleItemToDomain(e: RepaymentScheduleEntity): RepaymentScheduleItem {
    const item = new RepaymentScheduleItem();
    item.id = e.id;
    item.loanId = e.loan_id;
    item.installmentNumber = e.installment_number;
    item.dueDate = new Date(e.due_date);
    item.principalAmount = Number(e.principal_amount);
    item.interestAmount = Number(e.interest_amount);
    item.totalAmount = Number(e.total_amount);
    item.paidAmount = Number(e.paid_amount);
    item.status = e.status as RepaymentStatus;
    item.paidAt = e.paid_at ?? undefined;
    return item;
  }

  static scheduleItemToEntity(item: RepaymentScheduleItem): RepaymentScheduleEntity {
    const e = new RepaymentScheduleEntity();
    e.id = item.id;
    e.loan_id = item.loanId;
    e.installment_number = item.installmentNumber;
    e.due_date = item.dueDate.toISOString().split('T')[0];
    e.principal_amount = String(item.principalAmount);
    e.interest_amount = String(item.interestAmount);
    e.total_amount = String(item.totalAmount);
    e.paid_amount = String(item.paidAmount);
    e.status = item.status;
    e.paid_at = item.paidAt ?? null;
    return e;
  }

  // --- LoanPayment ---

  static paymentToDomain(e: LoanPaymentEntity): LoanPayment {
    const p = new LoanPayment();
    p.id = e.id;
    p.loanId = e.loan_id;
    p.scheduleId = e.schedule_id;
    p.amount = Number(e.amount);
    p.currency = e.currency as LoanCurrency;
    p.paymentDate = e.payment_date;
    p.recordedBy = e.recorded_by;
    p.notes = e.notes;
    p.createdAt = e.created_at;
    return p;
  }

  static paymentToEntity(p: LoanPayment): LoanPaymentEntity {
    const e = new LoanPaymentEntity();
    e.id = p.id;
    e.loan_id = p.loanId;
    e.schedule_id = p.scheduleId ?? null;
    e.amount = String(p.amount);
    e.currency = p.currency;
    e.payment_date = p.paymentDate;
    e.recorded_by = p.recordedBy;
    e.notes = p.notes ?? null;
    e.created_at = p.createdAt;
    return e;
  }

  // --- LoanPenalty ---

  static penaltyToDomain(e: LoanPenaltyEntity): LoanPenalty {
    const p = new LoanPenalty();
    p.id = e.id;
    p.loanId = e.loan_id;
    p.scheduleId = e.schedule_id;
    p.penaltyRate = Number(e.penalty_rate);
    p.penaltyAmount = Number(e.penalty_amount);
    p.appliedAt = e.applied_at;
    p.createdAt = e.created_at;
    return p;
  }

  static penaltyToEntity(p: LoanPenalty): LoanPenaltyEntity {
    const e = new LoanPenaltyEntity();
    e.id = p.id;
    e.loan_id = p.loanId;
    e.schedule_id = p.scheduleId;
    e.penalty_rate = String(p.penaltyRate);
    e.penalty_amount = String(p.penaltyAmount);
    e.applied_at = p.appliedAt;
    e.created_at = p.createdAt;
    return e;
  }

  // --- LoanDocument ---

  static documentToDomain(e: LoanDocumentEntity): LoanDocument {
    const d = new LoanDocument();
    d.id = e.id;
    d.loanId = e.loan_id;
    d.documentType = e.document_type as LoanDocumentType;
    d.fileName = e.file_name;
    d.fileUrl = e.file_url;
    d.uploadedBy = e.uploaded_by;
    d.uploadedAt = e.uploaded_at;
    return d;
  }

  static documentToEntity(d: LoanDocument): LoanDocumentEntity {
    const e = new LoanDocumentEntity();
    e.id = d.id;
    e.loan_id = d.loanId;
    e.document_type = d.documentType;
    e.file_name = d.fileName;
    e.file_url = d.fileUrl;
    e.uploaded_by = d.uploadedBy;
    e.uploaded_at = d.uploadedAt;
    return e;
  }
}


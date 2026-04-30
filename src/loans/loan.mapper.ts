import Decimal from 'decimal.js';
import {
  LoanCurrency,
  LoanDocumentType,
  LoanStatus,
  LoanType,
  ReminderChannel,
  ReminderStatus,
  RepaymentStatus,
} from './loan.enums';
import {
  LoanDocument,
  LoanModel,
  LoanModelProps,
  LoanPayment,
  LoanPenalty,
  LoanReminder,
  RepaymentScheduleItem,
} from './loan.model';
import {
  LoanDocumentEntity,
  LoanEntity,
  LoanPaymentEntity,
  LoanPenaltyEntity,
  LoanReminderEntity,
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
      principalAmount: new Decimal(e.principal_amount).toFixed(2),
      outstandingBalance: new Decimal(e.outstanding_balance).toFixed(2),
      interestRate: new Decimal(e.interest_rate).toFixed(6),
      termMonths: e.term_months,
      purpose: e.purpose ?? undefined,
      status: e.status as LoanStatus,
      rejectionReason: e.rejection_reason ?? undefined,
      appliedBy: e.applied_by,
      reviewedBy: e.reviewed_by ?? undefined,
      reviewedAt: e.reviewed_at ?? undefined,
      disbursedAt: e.disbursed_at ?? undefined,
      disbursedBy: e.disbursed_by ?? undefined,
      closedAt: e.closed_at ?? undefined,
      lateSince: e.late_since ?? undefined,
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
    e.principal_amount = new Decimal(m.principalAmount).toFixed(2);
    e.outstanding_balance = new Decimal(m.outstandingBalance).toFixed(2);
    e.interest_rate = new Decimal(m.interestRate).toFixed(6);
    e.term_months = m.termMonths;
    e.purpose = m.purpose ?? null;
    e.status = m.status;
    e.rejection_reason = m.rejectionReason ?? null;
    e.applied_by = m.appliedBy;
    e.reviewed_by = m.reviewedBy ?? null;
    e.reviewed_at = m.reviewedAt ?? null;
    e.disbursed_at = m.disbursedAt ?? null;
    e.disbursed_by = m.disbursedBy ?? null;
    e.closed_at = m.closedAt ?? null;
    e.late_since = m.lateSince ?? null;
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
    item.principalAmount = new Decimal(e.principal_amount).toFixed(2);
    item.interestAmount = new Decimal(e.interest_amount).toFixed(2);
    item.totalAmount = new Decimal(e.total_amount).toFixed(2);
    item.paidAmount = new Decimal(e.paid_amount).toFixed(2);
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
    e.principal_amount = new Decimal(item.principalAmount).toFixed(2);
    e.interest_amount = new Decimal(item.interestAmount).toFixed(2);
    e.total_amount = new Decimal(item.totalAmount).toFixed(2);
    e.paid_amount = new Decimal(item.paidAmount).toFixed(2);
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
    p.transactionId = e.transaction_id;
    p.amount = new Decimal(e.amount).toFixed(2);
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
    e.transaction_id = p.transactionId ?? null;
    e.amount = new Decimal(p.amount).toFixed(2);
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
    p.scheduleId = e.schedule_id ?? undefined;
    p.penaltyRate = new Decimal(e.penalty_rate).toFixed(4);
    p.penaltyAmount = new Decimal(e.penalty_amount).toFixed(2);
    p.appliedAt = e.applied_at;
    p.createdAt = e.created_at;
    return p;
  }

  static penaltyToEntity(p: LoanPenalty): LoanPenaltyEntity {
    const e = new LoanPenaltyEntity();
    e.id = p.id;
    e.loan_id = p.loanId;
    e.schedule_id = p.scheduleId ?? null;
    e.penalty_rate = new Decimal(p.penaltyRate).toFixed(4);
    e.penalty_amount = new Decimal(p.penaltyAmount).toFixed(2);
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

  // --- LoanReminder ---

  static reminderToDomain(e: LoanReminderEntity): LoanReminder {
    const r = new LoanReminder();
    r.id = e.id;
    r.loanId = e.loan_id;
    r.scheduleId = e.schedule_id ?? undefined;
    r.channel = e.channel as ReminderChannel;
    r.status = e.status as ReminderStatus;
    r.errorMessage = e.error_message;
    r.sentAt = e.sent_at;
    return r;
  }

  static reminderToEntity(r: LoanReminder): LoanReminderEntity {
    const e = new LoanReminderEntity();
    e.id = r.id;
    e.loan_id = r.loanId;
    e.schedule_id = r.scheduleId ?? null;
    e.channel = r.channel;
    e.status = r.status;
    e.error_message = r.errorMessage;
    e.sent_at = r.sentAt;
    return e;
  }
}


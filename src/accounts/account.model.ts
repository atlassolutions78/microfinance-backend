import { AccountType, AccountCurrency, AccountStatus } from './account.enums';

export interface AccountModelProps {
  id: string;
  accountNumber: string;
  clientId: string;
  branchId: string;
  accountType: AccountType;
  currency: AccountCurrency;
  status: AccountStatus;
  balance: number;
  openedBy: string;
  openedByName?: string;
  clientName?: string;
  clientNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The account domain model.
 *
 * Owns the account lifecycle and all rules that only need data on this object.
 * No NestJS, no TypeORM — pure TypeScript.
 */
export class AccountModel {
  readonly id: string;
  readonly accountNumber: string;
  readonly clientId: string;
  readonly branchId: string;
  readonly accountType: AccountType;
  readonly currency: AccountCurrency;
  readonly openedBy: string;
  readonly createdAt: Date;

  status: AccountStatus;
  balance: number;
  updatedAt: Date;

  /** Resolved display name — populated at read time, not persisted. */
  openedByName?: string;
  /** Client's display name — populated at read time, not persisted. */
  clientName?: string;
  /** Client's number (e.g. CL-000001) — populated at read time, not persisted. */
  clientNumber?: string;

  constructor(props: AccountModelProps) {
    this.id = props.id;
    this.accountNumber = props.accountNumber;
    this.clientId = props.clientId;
    this.branchId = props.branchId;
    this.accountType = props.accountType;
    this.currency = props.currency;
    this.status = props.status;
    this.balance = props.balance;
    this.openedBy = props.openedBy;
    this.openedByName = props.openedByName;
    this.clientName = props.clientName;
    this.clientNumber = props.clientNumber;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // --- Lifecycle transitions ---

  activate(): void {
    if (this.status !== AccountStatus.PENDING) {
      throw new Error(`Cannot activate account in status: ${this.status}`);
    }
    this.status = AccountStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  suspend(): void {
    if (
      this.status !== AccountStatus.ACTIVE &&
      this.status !== AccountStatus.DORMANT
    ) {
      throw new Error(`Cannot suspend account in status: ${this.status}`);
    }
    this.status = AccountStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  markDormant(): void {
    if (this.status !== AccountStatus.ACTIVE) {
      throw new Error(`Cannot mark account dormant in status: ${this.status}`);
    }
    this.status = AccountStatus.DORMANT;
    this.updatedAt = new Date();
  }

  reactivate(): void {
    if (
      this.status !== AccountStatus.SUSPENDED &&
      this.status !== AccountStatus.DORMANT
    ) {
      throw new Error(`Cannot reactivate account in status: ${this.status}`);
    }
    this.status = AccountStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  close(): void {
    if (this.status === AccountStatus.CLOSED) {
      throw new Error('Account is already closed.');
    }
    this.status = AccountStatus.CLOSED;
    this.updatedAt = new Date();
  }
}

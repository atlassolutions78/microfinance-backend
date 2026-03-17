import { ClientType, KycStatus } from './client.enums';

export interface ClientModelProps {
  id: string;
  clientNumber: string;
  type: ClientType;
  kycStatus: KycStatus;
  branchId: string;
  createdBy: string;
  kycReviewedBy: string | null;
  kycReviewedAt: Date | null;
  kycNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The client domain model — owns the KYC lifecycle.
 * No NestJS, no TypeORM — pure TypeScript.
 */
export class ClientModel {
  readonly id: string;
  readonly clientNumber: string;
  readonly type: ClientType;
  readonly branchId: string;
  readonly createdBy: string;
  readonly createdAt: Date;

  kycStatus: KycStatus;
  kycReviewedBy: string | null;
  kycReviewedAt: Date | null;
  kycNotes: string | null;
  updatedAt: Date;

  constructor(props: ClientModelProps) {
    this.id = props.id;
    this.clientNumber = props.clientNumber;
    this.type = props.type;
    this.kycStatus = props.kycStatus;
    this.branchId = props.branchId;
    this.createdBy = props.createdBy;
    this.kycReviewedBy = props.kycReviewedBy;
    this.kycReviewedAt = props.kycReviewedAt;
    this.kycNotes = props.kycNotes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // --- KYC lifecycle ---

  submitForReview(): void {
    if (
      this.kycStatus !== KycStatus.PENDING &&
      this.kycStatus !== KycStatus.REJECTED &&
      this.kycStatus !== KycStatus.REQUIRES_UPDATE
    ) {
      throw new Error(
        `Cannot submit for review from status: ${this.kycStatus}`,
      );
    }
    this.kycStatus = KycStatus.UNDER_REVIEW;
    this.updatedAt = new Date();
  }

  approveKyc(officerId: string): void {
    if (this.kycStatus !== KycStatus.UNDER_REVIEW) {
      throw new Error(`Cannot approve KYC from status: ${this.kycStatus}`);
    }
    this.kycStatus = KycStatus.APPROVED;
    this.kycReviewedBy = officerId;
    this.kycReviewedAt = new Date();
    this.kycNotes = null;
    this.updatedAt = new Date();
  }

  rejectKyc(officerId: string, notes: string): void {
    if (this.kycStatus !== KycStatus.UNDER_REVIEW) {
      throw new Error(`Cannot reject KYC from status: ${this.kycStatus}`);
    }
    this.kycStatus = KycStatus.REJECTED;
    this.kycReviewedBy = officerId;
    this.kycReviewedAt = new Date();
    this.kycNotes = notes;
    this.updatedAt = new Date();
  }

  requestUpdate(officerId: string, notes: string): void {
    if (this.kycStatus !== KycStatus.UNDER_REVIEW) {
      throw new Error(`Cannot request update from status: ${this.kycStatus}`);
    }
    this.kycStatus = KycStatus.REQUIRES_UPDATE;
    this.kycReviewedBy = officerId;
    this.kycReviewedAt = new Date();
    this.kycNotes = notes;
    this.updatedAt = new Date();
  }
}

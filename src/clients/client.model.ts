import {
  ClientType,
  ClientStatus,
  KycStatus,
  Gender,
  IdType,
  SignaturePolicy,
  GuardianRelationship,
} from './client.enums';

// ---------------------------------------------------------------------------
// Value objects embedded in the domain model
// ---------------------------------------------------------------------------

export interface IndividualDetails {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: Date;
  gender: Gender;
  nationality: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  country: string;
  postalCode?: string;
  idType: IdType;
  idNumber: string;
  idExpiryDate: Date;
  isMinor: boolean;
}

export interface GuardianDetails {
  firstName: string;
  lastName: string;
  relationship: GuardianRelationship;
  phone: string;
  email?: string;
  idType: IdType;
  idNumber: string;
  idExpiryDate: Date;
}

export interface BusinessDetails {
  companyName: string;
  registrationNumber: string;
  taxId?: string;
  businessType?: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  country: string;
  postalCode?: string;
  signaturePolicy: SignaturePolicy;
}

export interface RepresentativeDetails {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  email?: string;
  idType: IdType;
  idNumber: string;
  idExpiryDate: Date;
  isPrimarySignatory: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Domain model constructor props
// ---------------------------------------------------------------------------

export interface ClientModelProps {
  id: string;
  clientNumber: string;
  type: ClientType;
  status: ClientStatus;
  kycStatus: KycStatus;
  kycVerifiedBy?: string;
  kycVerifiedAt?: Date;
  kycRejectionReason?: string;
  kycExpiryDate?: Date;
  individualDetails?: IndividualDetails;
  guardian?: GuardianDetails;
  businessDetails?: BusinessDetails;
  representatives: RepresentativeDetails[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Domain model
// ---------------------------------------------------------------------------

/**
 * The client domain model — owns the KYC lifecycle and client status rules.
 * No NestJS, no TypeORM — pure TypeScript.
 */
export class ClientModel {
  readonly id: string;
  readonly clientNumber: string;
  readonly type: ClientType;
  readonly createdBy: string;
  readonly createdAt: Date;

  status: ClientStatus;
  kycStatus: KycStatus;
  kycVerifiedBy?: string;
  kycVerifiedAt?: Date;
  kycRejectionReason?: string;
  kycExpiryDate?: Date;
  updatedAt: Date;

  // Type-specific details
  individualDetails?: IndividualDetails;
  guardian?: GuardianDetails;
  businessDetails?: BusinessDetails;
  representatives: RepresentativeDetails[];

  constructor(props: ClientModelProps) {
    this.id = props.id;
    this.clientNumber = props.clientNumber;
    this.type = props.type;
    this.status = props.status;
    this.kycStatus = props.kycStatus;
    this.kycVerifiedBy = props.kycVerifiedBy;
    this.kycVerifiedAt = props.kycVerifiedAt;
    this.kycRejectionReason = props.kycRejectionReason;
    this.kycExpiryDate = props.kycExpiryDate;
    this.individualDetails = props.individualDetails;
    this.guardian = props.guardian;
    this.businessDetails = props.businessDetails;
    this.representatives = props.representatives;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // --- KYC lifecycle ---

  verifyKyc(officerId: string, expiryDate: Date): void {
    if (this.kycStatus === KycStatus.VERIFIED) {
      throw new Error('KYC is already verified.');
    }
    this.kycStatus = KycStatus.VERIFIED;
    this.kycVerifiedBy = officerId;
    this.kycVerifiedAt = new Date();
    this.kycExpiryDate = expiryDate;
    this.kycRejectionReason = undefined;
    this.updatedAt = new Date();
  }

  rejectKyc(reason: string): void {
    if (this.kycStatus === KycStatus.REJECTED) {
      throw new Error('KYC is already rejected.');
    }
    this.kycStatus = KycStatus.REJECTED;
    this.kycRejectionReason = reason;
    this.kycVerifiedBy = undefined;
    this.kycVerifiedAt = undefined;
    this.updatedAt = new Date();
  }

  expireKyc(): void {
    if (this.kycStatus !== KycStatus.VERIFIED) {
      throw new Error(`Cannot expire KYC in status: ${this.kycStatus}`);
    }
    this.kycStatus = KycStatus.EXPIRED;
    this.updatedAt = new Date();
  }

  resetKyc(): void {
    if (
      this.kycStatus !== KycStatus.REJECTED &&
      this.kycStatus !== KycStatus.EXPIRED
    ) {
      throw new Error(
        `KYC can only be reset from REJECTED or EXPIRED, not from ${this.kycStatus}`,
      );
    }
    this.kycStatus = KycStatus.PENDING;
    this.kycVerifiedBy = undefined;
    this.kycVerifiedAt = undefined;
    this.kycRejectionReason = undefined;
    this.kycExpiryDate = undefined;
    this.updatedAt = new Date();
  }

  // --- Client status lifecycle ---

  deactivate(): void {
    if (this.status === ClientStatus.INACTIVE) {
      throw new Error('Client is already inactive.');
    }
    this.status = ClientStatus.INACTIVE;
    this.updatedAt = new Date();
  }

  reactivate(): void {
    if (this.status === ClientStatus.BLACKLISTED) {
      throw new Error('A blacklisted client cannot be reactivated directly.');
    }
    if (this.status === ClientStatus.ACTIVE) {
      throw new Error('Client is already active.');
    }
    this.status = ClientStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  blacklist(): void {
    if (this.status === ClientStatus.BLACKLISTED) {
      throw new Error('Client is already blacklisted.');
    }
    this.status = ClientStatus.BLACKLISTED;
    this.updatedAt = new Date();
  }

  // --- Business helpers ---

  isMinor(): boolean {
    return this.type === ClientType.INDIVIDUAL &&
      (this.individualDetails?.isMinor ?? false);
  }

  hasKycExpired(): boolean {
    if (!this.kycExpiryDate) return false;
    return this.kycExpiryDate < new Date();
  }
}

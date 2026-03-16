export enum ClientType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
}

export enum KycStatus {
  PENDING = 'PENDING',     // Submitted, awaiting officer review
  VERIFIED = 'VERIFIED',   // Approved and within expiry
  REJECTED = 'REJECTED',   // Declined, must resubmit
  EXPIRED = 'EXPIRED',     // ID has passed its expiry date
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum IdType {
  NATIONAL_ID = 'NATIONAL_ID',
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  RESIDENCE_PERMIT = 'RESIDENCE_PERMIT',
}

export enum SignaturePolicy {
  SINGLE = 'SINGLE',   // Any one signatory can authorise
  DUAL = 'DUAL',       // Exactly two signatories required
  ANY_TWO = 'ANY_TWO', // Any two of the listed signatories
}

export enum GuardianRelationship {
  PARENT = 'PARENT',
  LEGAL_GUARDIAN = 'LEGAL_GUARDIAN',
  SIBLING = 'SIBLING',
  GRANDPARENT = 'GRANDPARENT',
  OTHER = 'OTHER',
}

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
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_UPDATE = 'REQUIRES_UPDATE',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum IdType {
  NATIONAL_ID = 'NATIONAL_ID',
  PASSPORT = 'PASSPORT',
  CEPGL_CARD = 'CEPGL_CARD',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export enum SignatoryType {
  MANDATORY = 'MANDATORY',
  OPTIONAL = 'OPTIONAL',
}

export enum SignaturePolicy {
  SINGLE = 'SINGLE', // Any one signatory can authorise
  DUAL = 'DUAL', // Exactly two signatories required
  ANY_TWO = 'ANY_TWO', // Any two of the listed signatories
}

export enum GuardianRelationship {
  PARENT = 'PARENT',
  LEGAL_GUARDIAN = 'LEGAL_GUARDIAN',
  SIBLING = 'SIBLING',
  GRANDPARENT = 'GRANDPARENT',
  OTHER = 'OTHER',
}

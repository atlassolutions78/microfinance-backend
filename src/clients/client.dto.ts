import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ClientType,
  Gender,
  GuardianRelationship,
  IdType,
  SignaturePolicy,
} from './client.enums';

// ---------------------------------------------------------------------------
// Shared sub-objects
// ---------------------------------------------------------------------------

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  stateProvince?: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class GuardianDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(GuardianRelationship)
  relationship: GuardianRelationship;

  @IsString()
  @MinLength(7)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(IdType)
  idType: IdType;

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsDateString()
  idExpiryDate: string;
}

export class RepresentativeDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @MinLength(7)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(IdType)
  idType: IdType;

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsDateString()
  idExpiryDate: string;

  @IsBoolean()
  isPrimarySignatory: boolean;
}

// ---------------------------------------------------------------------------
// Individual client onboarding
// ---------------------------------------------------------------------------

export class CreateIndividualClientDto {
  readonly type = ClientType.INDIVIDUAL;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @IsNotEmpty()
  nationality: string;

  @IsString()
  @MinLength(7)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @IsEnum(IdType)
  idType: IdType;

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsDateString()
  idExpiryDate: string;

  @IsBoolean()
  isMinor: boolean;

  /** Required when isMinor is true */
  @IsOptional()
  @ValidateNested()
  @Type(() => GuardianDto)
  guardian?: GuardianDto;
}

// ---------------------------------------------------------------------------
// Business client onboarding
// ---------------------------------------------------------------------------

export class CreateBusinessClientDto {
  readonly type = ClientType.BUSINESS;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsString()
  @MinLength(7)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @IsEnum(SignaturePolicy)
  signaturePolicy: SignaturePolicy;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RepresentativeDto)
  representatives: RepresentativeDto[];
}

// ---------------------------------------------------------------------------
// KYC actions
// ---------------------------------------------------------------------------

export class VerifyKycDto {
  /** The ID expiry date to record on the KYC record (drives EXPIRED transitions) */
  @IsDateString()
  expiryDate: string;
}

export class RejectKycDto {
  @IsString()
  @MinLength(10)
  reason: string;
}

// ---------------------------------------------------------------------------
// Client status actions
// ---------------------------------------------------------------------------

export class BlacklistClientDto {
  @IsString()
  @MinLength(5)
  reason: string;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export class SearchClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

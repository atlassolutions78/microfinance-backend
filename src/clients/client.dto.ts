import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Gender,
  IdType,
  MaritalStatus,
  OrganizationType,
  SignatoryType,
} from './client.enums';

export class CreateIndividualClientDto {
  // ═══ PERSONAL INFORMATION ═══
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  lastName: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  nationality: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  placeOfBirth: string;

  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @IsString()
  profession: string;

  @IsString()
  provinceOfOrigin: string;

  // ═══ IDENTIFICATION ═══
  @IsEnum(IdType)
  identificationType: IdType;

  @IsString()
  identificationNumber: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  // ═══ ADDRESS ═══
  @IsString()
  province: string;

  @IsString()
  municipality: string;

  @IsString()
  neighborhood: string;

  @IsString()
  street: string;

  @IsString()
  plotNumber: string;

  // ═══ CONTACT ═══
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // ═══ REPRESENTATIVE ═══
  @IsBoolean()
  addRepresentative: boolean;

  @ValidateIf((o: CreateIndividualClientDto) => o.addRepresentative)
  @IsString()
  representativeFirstName?: string;

  @IsOptional()
  @IsString()
  representativeMiddleName?: string;

  @ValidateIf((o: CreateIndividualClientDto) => o.addRepresentative)
  @IsString()
  representativeLastName?: string;

  @ValidateIf((o: CreateIndividualClientDto) => o.addRepresentative)
  @IsEnum(IdType)
  representativeIdType?: IdType;

  @ValidateIf((o: CreateIndividualClientDto) => o.addRepresentative)
  @IsString()
  representativeIdNumber?: string;

  // ═══ MINOR GUARDIAN ═══
  @IsBoolean()
  isMinor: boolean;

  @ValidateIf((o: CreateIndividualClientDto) => o.isMinor)
  @IsString()
  responsiblePersonFirstName?: string;

  @IsOptional()
  @IsString()
  responsiblePersonMiddleName?: string;

  @ValidateIf((o: CreateIndividualClientDto) => o.isMinor)
  @IsString()
  responsiblePersonLastName?: string;
}

export class AttachIndividualDocumentsDto {
  @IsArray()
  @IsString({ each: true })
  passportPhotos: string[];

  @IsString()
  identificationDocument: string;

  @IsOptional()
  @IsString()
  signatureFile?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalDocuments?: string[];

  @IsOptional()
  @IsString()
  representativeIdDocument?: string;

  @IsOptional()
  @IsString()
  responsiblePersonIdDocument?: string;
}

// ─── Organization ────────────────────────────────────────────────────────────

export class CreateOrgRepresentativeDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(IdType)
  idType: IdType;

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  province: string;

  @IsString()
  @IsNotEmpty()
  municipality: string;

  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  plotNumber: string;

  @IsEnum(SignatoryType)
  signatoryType: SignatoryType;

  @IsString()
  @IsNotEmpty()
  role: string;
}

export class CreateOrganizationClientDto {
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @ValidateIf(
    (o: CreateOrganizationClientDto) =>
      o.organizationType === OrganizationType.OTHER,
  )
  @IsString()
  @IsNotEmpty()
  organizationTypeOther?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrgRepresentativeDto)
  organizationRepresentatives: CreateOrgRepresentativeDto[];
}

export class ApproveKycDto {}

export class RejectKycDto {
  @IsString()
  @MinLength(10)
  notes: string;
}

export class RequestUpdateDto {
  @IsString()
  @MinLength(10)
  notes: string;
}

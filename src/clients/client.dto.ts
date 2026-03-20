import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Gender, IdType, MaritalStatus } from './client.enums';

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

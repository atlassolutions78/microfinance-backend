import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import {
  ClientDocumentType,
  RepresentativeDocumentType,
  GuardianDocumentType,
} from './document.enums';

export class UploadClientDocumentDto {
  @IsUUID()
  clientId: string;

  @IsEnum(ClientDocumentType)
  documentType: ClientDocumentType;

  @IsString()
  fileUrl: string;

  @IsString()
  fileName: string;
}

export class UploadRepresentativeDocumentDto {
  @IsUUID()
  representativeId: string;

  @IsEnum(RepresentativeDocumentType)
  documentType: RepresentativeDocumentType;

  @IsString()
  fileUrl: string;

  @IsString()
  fileName: string;
}

export class UploadGuardianDocumentDto {
  @IsUUID()
  guardianId: string;

  @IsEnum(GuardianDocumentType)
  documentType: GuardianDocumentType;

  @IsString()
  fileUrl: string;

  @IsString()
  fileName: string;
}

export class RejectDocumentDto {
  @IsString()
  @MinLength(5)
  reason: string;
}

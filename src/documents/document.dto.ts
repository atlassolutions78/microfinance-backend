import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  ClientDocumentType,
  RepresentativeDocumentType,
  GuardianDocumentType,
  OrgRepresentativeDocumentType,
} from './document.enums';

export class UploadClientDocumentDto {
  @ApiProperty({
    description: 'UUID of the client this document belongs to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    enum: ClientDocumentType,
    description: 'Type of client document',
    example: ClientDocumentType.ID_DOCUMENT,
  })
  @IsEnum(ClientDocumentType)
  documentType: ClientDocumentType;

  @ApiProperty({
    description: 'S3 key or URL of the uploaded file',
    example: 'clients/a1b2c3d4/id_document.jpg',
  })
  @IsString()
  fileUrl: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'national_id_front.jpg',
  })
  @IsString()
  fileName: string;
}

export class UploadRepresentativeDocumentDto {
  @ApiProperty({
    description: 'UUID of the representative this document belongs to',
    example: 'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  representativeId: string;

  @ApiProperty({
    enum: RepresentativeDocumentType,
    description: 'Type of representative document',
    example: RepresentativeDocumentType.ID_DOCUMENT,
  })
  @IsEnum(RepresentativeDocumentType)
  documentType: RepresentativeDocumentType;

  @ApiProperty({
    description: 'S3 key or URL of the uploaded file',
    example: 'representatives/e1b2c3d4/id_document.jpg',
  })
  @IsString()
  fileUrl: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'rep_passport.jpg',
  })
  @IsString()
  fileName: string;
}

export class UploadGuardianDocumentDto {
  @ApiProperty({
    description: 'UUID of the guardian this document belongs to',
    example: 'f1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  guardianId: string;

  @ApiProperty({
    enum: GuardianDocumentType,
    description: 'Type of guardian document',
    example: GuardianDocumentType.ID_DOCUMENT,
  })
  @IsEnum(GuardianDocumentType)
  documentType: GuardianDocumentType;

  @ApiProperty({
    description: 'S3 key or URL of the uploaded file',
    example: 'guardians/f1b2c3d4/id_document.jpg',
  })
  @IsString()
  fileUrl: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'guardian_id.jpg',
  })
  @IsString()
  fileName: string;
}

export class UploadOrgRepresentativeDocumentDto {
  @ApiProperty({
    description:
      'UUID of the organisation representative this document belongs to',
    example: 'g1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  orgRepresentativeId: string;

  @ApiProperty({
    enum: OrgRepresentativeDocumentType,
    description: 'Type of organisation representative document',
    example: OrgRepresentativeDocumentType.ID_DOCUMENT,
  })
  @IsEnum(OrgRepresentativeDocumentType)
  documentType: OrgRepresentativeDocumentType;

  @ApiProperty({
    description: 'S3 key or URL of the uploaded file',
    example: 'org-reps/g1b2c3d4/id_document.jpg',
  })
  @IsString()
  fileUrl: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'director_passport.jpg',
  })
  @IsString()
  fileName: string;
}

export class RejectDocumentDto {
  @ApiProperty({
    description: 'Reason for rejection (minimum 5 characters)',
    example: 'Document is blurry and unreadable',
  })
  @IsString()
  @MinLength(5)
  reason: string;
}

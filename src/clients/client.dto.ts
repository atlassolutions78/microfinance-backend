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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Gender,
  IdType,
  MaritalStatus,
  OrganizationType,
  SignatoryType,
} from './client.enums';

export class CreateIndividualClientDto {
  // ═══ PERSONAL INFORMATION ═══
  @ApiProperty({ description: 'First name of the client', example: 'Marie' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({
    description: 'Middle name (optional)',
    example: 'Claire',
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ description: 'Last name of the client', example: 'Kabongo' })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: Gender, example: Gender.FEMALE })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 'Congolese' })
  @IsString()
  nationality: string;

  @ApiProperty({
    description: 'Date of birth in ISO format',
    example: '1990-06-15',
  })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: 'Lubumbashi' })
  @IsString()
  placeOfBirth: string;

  @ApiProperty({ enum: MaritalStatus, example: MaritalStatus.MARRIED })
  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @ApiProperty({ example: 'Nurse' })
  @IsString()
  profession: string;

  @ApiProperty({ example: 'Katanga' })
  @IsString()
  provinceOfOrigin: string;

  // ═══ IDENTIFICATION ═══
  @ApiProperty({ enum: IdType, example: IdType.NATIONAL_ID })
  @IsEnum(IdType)
  identificationType: IdType;

  @ApiProperty({ example: '1-9012-34567890-12' })
  @IsString()
  identificationNumber: string;

  @ApiPropertyOptional({
    description: 'Registration number if applicable',
    example: 'REG-2024-001',
  })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  // ═══ ADDRESS ═══
  @ApiProperty({ example: 'Kinshasa' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Gombe' })
  @IsString()
  municipality: string;

  @ApiProperty({ example: 'Lingwala' })
  @IsString()
  neighborhood: string;

  @ApiProperty({ example: 'Avenue des Aviateurs' })
  @IsString()
  street: string;

  @ApiProperty({ example: '42B' })
  @IsString()
  plotNumber: string;

  // ═══ CONTACT ═══
  @ApiProperty({ example: '+243812345678' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'marie.kabongo@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  // ═══ REPRESENTATIVE ═══
  @ApiProperty({
    description: 'Set to true to include a representative',
    example: false,
  })
  @IsBoolean()
  addRepresentative: boolean;

  @ApiPropertyOptional({
    description: 'Required when addRepresentative is true',
    example: 'Paul',
  })
  @ValidateIf((o: CreateIndividualClientDto) => o.addRepresentative)
  @IsString()
  representativeFirstName?: string;

  @ApiPropertyOptional({ example: 'André' })
  @IsOptional()
  @IsString()
  representativeMiddleName?: string;

  @ApiPropertyOptional({
    description: 'Required when addRepresentative is true',
    example: 'Kabongo',
  })
  @ValidateIf((o: CreateIndividualClientDto) => o.addRepresentative)
  @IsString()
  representativeLastName?: string;

  @ApiPropertyOptional({
    enum: IdType,
    description: 'Required when addRepresentative is true',
    example: IdType.NATIONAL_ID,
  })
  @ValidateIf((o: CreateIndividualClientDto) => o.addRepresentative)
  @IsEnum(IdType)
  representativeIdType?: IdType;

  @ApiPropertyOptional({
    description: 'Required when addRepresentative is true',
    example: '1-8511-12345678-90',
  })
  @ValidateIf((o: CreateIndividualClientDto) => o.addRepresentative)
  @IsString()
  representativeIdNumber?: string;

  // ═══ MINOR GUARDIAN ═══
  @ApiProperty({
    description: 'Set to true if the client is a minor',
    example: false,
  })
  @IsBoolean()
  isMinor: boolean;

  @ApiPropertyOptional({
    description: 'Required when isMinor is true',
    example: 'Thérèse',
  })
  @ValidateIf((o: CreateIndividualClientDto) => o.isMinor)
  @IsString()
  responsiblePersonFirstName?: string;

  @ApiPropertyOptional({ example: 'Jeanne' })
  @IsOptional()
  @IsString()
  responsiblePersonMiddleName?: string;

  @ApiPropertyOptional({
    description: 'Required when isMinor is true',
    example: 'Kabongo',
  })
  @ValidateIf((o: CreateIndividualClientDto) => o.isMinor)
  @IsString()
  responsiblePersonLastName?: string;
}

export class AttachIndividualDocumentsDto {
  @ApiProperty({
    description: 'Array of S3 keys for passport photos',
    type: [String],
    example: ['clients/a1b2c3d4/photo1.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  passportPhotos: string[];

  @ApiProperty({
    description: 'S3 key of the identification document',
    example: 'clients/a1b2c3d4/national_id.jpg',
  })
  @IsString()
  identificationDocument: string;

  @ApiPropertyOptional({
    description: 'S3 key of the signature file',
    example: 'clients/a1b2c3d4/signature.png',
  })
  @IsOptional()
  @IsString()
  signatureFile?: string;

  @ApiPropertyOptional({
    description: 'Array of S3 keys for any additional documents',
    type: [String],
    example: ['clients/a1b2c3d4/proof_of_address.pdf'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalDocuments?: string[];

  @ApiPropertyOptional({
    description: 'S3 key of the representative ID document',
    example: 'clients/a1b2c3d4/rep_id.jpg',
  })
  @IsOptional()
  @IsString()
  representativeIdDocument?: string;

  @ApiPropertyOptional({
    description: 'S3 key of the responsible person ID document (for minors)',
    example: 'clients/a1b2c3d4/guardian_id.jpg',
  })
  @IsOptional()
  @IsString()
  responsiblePersonIdDocument?: string;
}

// ─── Organization ────────────────────────────────────────────────────────────

export class CreateOrgRepresentativeDto {
  @ApiProperty({ example: 'Jean-Pierre' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ example: 'Claude' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Mutombo' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ enum: IdType, example: IdType.PASSPORT })
  @IsEnum(IdType)
  idType: IdType;

  @ApiProperty({ example: 'CD1234567' })
  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @ApiProperty({ example: '+243898765432' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'jp.mutombo@acmeltd.cd' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Kinshasa' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: 'Gombe' })
  @IsString()
  @IsNotEmpty()
  municipality: string;

  @ApiProperty({ example: 'Lingwala' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: 'Avenue des Aviateurs' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: '10A' })
  @IsString()
  @IsNotEmpty()
  plotNumber: string;

  @ApiProperty({ enum: SignatoryType, example: SignatoryType.MANDATORY })
  @IsEnum(SignatoryType)
  signatoryType: SignatoryType;

  @ApiProperty({
    description: 'Job title or role within the organisation',
    example: 'Director General',
  })
  @IsString()
  @IsNotEmpty()
  role: string;
}

export class CreateOrganizationClientDto {
  @ApiProperty({ example: 'Acme Trading Ltd' })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.COMPANY })
  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @ApiPropertyOptional({
    description: 'Required when organizationType is OTHER',
    example: 'Cooperative',
  })
  @ValidateIf(
    (o: CreateOrganizationClientDto) =>
      o.organizationType === OrganizationType.OTHER,
  )
  @IsString()
  @IsNotEmpty()
  organizationTypeOther?: string;

  @ApiProperty({
    type: [CreateOrgRepresentativeDto],
    description: 'List of organisation representatives',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrgRepresentativeDto)
  organizationRepresentatives: CreateOrgRepresentativeDto[];
}

export class ApproveKycDto {}

export class RejectKycDto {
  @ApiProperty({
    description: 'Notes explaining the rejection (minimum 10 characters)',
    example: 'Identification document has expired. Please provide a valid ID.',
  })
  @IsString()
  @MinLength(10)
  notes: string;
}

export class RequestUpdateDto {
  @ApiProperty({
    description:
      'Notes describing what needs to be updated (minimum 10 characters)',
    example: 'Please upload a clearer photo of the national ID card.',
  })
  @IsString()
  @MinLength(10)
  notes: string;
}

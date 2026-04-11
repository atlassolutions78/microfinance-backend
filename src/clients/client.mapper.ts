import { randomUUID } from 'crypto';
import {
  ClientEntity,
  IndividualProfileEntity,
  MinorGuardianEntity,
  OrganizationProfileEntity,
  OrganizationRepresentativeEntity,
  RepresentativeEntity,
} from './client.entity';
import { ClientModel } from './client.model';
import {
  CreateIndividualClientDto,
  CreateOrganizationClientDto,
  CreateOrgRepresentativeDto,
} from './client.dto';
import { KycStatus } from './client.enums';

// ── Full API response shape (client + profile combined) ─────────────────────

export interface ClientApiResponse {
  id: string;
  clientNumber: string;
  type: string;
  status: string;
  kycStatus: string;
  createdAt: Date;
  updatedAt: Date;
  // Individual
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  nationality?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  maritalStatus?: string;
  profession?: string;
  provinceOfOrigin?: string;
  province?: string;
  municipality?: string;
  neighborhood?: string;
  street?: string;
  plotNumber?: string;
  phone?: string;
  email?: string;
  identificationType?: string;
  identificationNumber?: string;
  // Organization
  companyName?: string;
  organizationType?: string;
  industry?: string;
  // Representatives (individual client)
  representative?: {
    firstName: string;
    middleName?: string;
    lastName: string;
    idType?: string;
    idNumber: string;
  };
  guardian?: {
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  // Representatives (organization client)
  representatives?: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    idType?: string;
    idNumber: string;
    phone: string;
    email?: string;
    role?: string;
    signatoryType: string;
    address: {
      province: string;
      municipality: string;
      neighborhood: string;
      street: string;
      plotNumber: string;
    };
  }[];
  // Common
  segment?: string;
}

function kycStatusToClientStatus(kycStatus: KycStatus): string {
  if (kycStatus === KycStatus.APPROVED) return 'ACTIVE';
  if (kycStatus === KycStatus.REJECTED) return 'REJECTED';
  return 'KYC_PENDING';
}

/**
 * Translates between entities (DB) and domain models / DTOs.
 * The only file that knows about both shapes.
 */
export class ClientMapper {
  static toDomain(entity: ClientEntity): ClientModel {
    return new ClientModel({
      id: entity.id,
      clientNumber: entity.client_number,
      type: entity.type,
      kycStatus: entity.kyc_status,
      branchId: entity.branch_id,
      createdBy: entity.created_by,
      kycReviewedBy: entity.kyc_reviewed_by,
      kycReviewedAt: entity.kyc_reviewed_at,
      kycNotes: entity.kyc_notes,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  static toApiResponse(
    entity: ClientEntity,
    individualProfile?: IndividualProfileEntity | null,
    orgProfile?: OrganizationProfileEntity | null,
    representative?: RepresentativeEntity | null,
    guardian?: MinorGuardianEntity | null,
    orgRepresentatives?: OrganizationRepresentativeEntity[],
  ): ClientApiResponse {
    const base: ClientApiResponse = {
      id: entity.id,
      clientNumber: entity.client_number,
      type: entity.type,
      status: kycStatusToClientStatus(entity.kyc_status),
      kycStatus: entity.kyc_status,
      segment: entity.segment ?? 'RETAIL',
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };

    if (individualProfile) {
      base.firstName = individualProfile.first_name;
      base.middleName = individualProfile.middle_name ?? undefined;
      base.lastName = individualProfile.last_name;
      base.gender = individualProfile.gender;
      base.nationality = individualProfile.nationality;
      base.dateOfBirth = individualProfile.date_of_birth != null
        ? (individualProfile.date_of_birth instanceof Date
            ? individualProfile.date_of_birth
            : new Date(String(individualProfile.date_of_birth))
          ).toISOString().slice(0, 10)
        : undefined;
      base.placeOfBirth = individualProfile.place_of_birth ?? undefined;
      base.maritalStatus = individualProfile.marital_status;
      base.profession = individualProfile.profession;
      base.provinceOfOrigin = individualProfile.province_of_origin ?? undefined;
      base.province = individualProfile.province;
      base.municipality = individualProfile.municipality;
      base.neighborhood = individualProfile.neighborhood;
      base.street = individualProfile.street;
      base.plotNumber = individualProfile.plot_number;
      base.phone = individualProfile.phone;
      base.email = individualProfile.email ?? undefined;
      base.identificationType = individualProfile.id_type;
      base.identificationNumber = individualProfile.id_number;
    }

    if (orgProfile) {
      base.companyName = orgProfile.organization_name;
      base.organizationType = orgProfile.organization_type;
      base.industry = orgProfile.industry ?? undefined;
      base.phone = orgProfile.phone ?? undefined;
      base.email = orgProfile.email ?? undefined;
      base.province = orgProfile.province ?? undefined;
      base.municipality = orgProfile.municipality ?? undefined;
      base.identificationType = orgProfile.registration_type ?? undefined;
      base.identificationNumber = orgProfile.registration_number ?? undefined;
    }

    if (representative) {
      base.representative = {
        firstName: representative.first_name,
        middleName: representative.middle_name ?? undefined,
        lastName: representative.last_name,
        idType: representative.id_type ?? undefined,
        idNumber: representative.id_number,
      };
    }

    if (guardian) {
      base.guardian = {
        firstName: guardian.first_name,
        middleName: guardian.middle_name ?? undefined,
        lastName: guardian.last_name,
      };
    }

    if (orgRepresentatives && orgRepresentatives.length > 0) {
      base.representatives = orgRepresentatives.map((r) => ({
        id: r.id,
        firstName: r.first_name,
        middleName: r.middle_name ?? undefined,
        lastName: r.last_name,
        idType: r.id_type ?? undefined,
        idNumber: r.id_number,
        phone: r.phone,
        email: r.email ?? undefined,
        role: r.role ?? undefined,
        signatoryType: r.signatory_type,
        address: {
          province: r.province,
          municipality: r.municipality,
          neighborhood: r.neighborhood,
          street: r.street,
          plotNumber: r.plot_number,
        },
      }));
    }

    return base;
  }

  static toEntity(model: ClientModel): ClientEntity {
    const entity = new ClientEntity();
    entity.id = model.id;
    entity.client_number = model.clientNumber;
    entity.type = model.type;
    entity.kyc_status = model.kycStatus;
    entity.branch_id = model.branchId;
    entity.created_by = model.createdBy;
    entity.kyc_reviewed_by = model.kycReviewedBy;
    entity.kyc_reviewed_at = model.kycReviewedAt;
    entity.kyc_notes = model.kycNotes;
    return entity;
  }

  static toIndividualProfileEntity(
    clientId: string,
    dto: CreateIndividualClientDto,
  ): IndividualProfileEntity {
    const entity = new IndividualProfileEntity();
    entity.client_id = clientId;
    entity.first_name = dto.firstName;
    entity.middle_name = dto.middleName ?? null;
    entity.last_name = dto.lastName;
    entity.gender = dto.gender;
    entity.nationality = dto.nationality;
    entity.date_of_birth = new Date(dto.dateOfBirth);
    entity.place_of_birth = dto.placeOfBirth;
    entity.province_of_origin = dto.provinceOfOrigin;
    entity.marital_status = dto.maritalStatus;
    entity.profession = dto.profession;
    entity.province = dto.province;
    entity.municipality = dto.municipality;
    entity.neighborhood = dto.neighborhood;
    entity.street = dto.street;
    entity.plot_number = dto.plotNumber;
    entity.phone = dto.phoneNumber;
    entity.email = dto.email ?? null;
    entity.id_type = dto.identificationType;
    entity.id_number = dto.identificationNumber;
    entity.matriculation_number = dto.registrationNumber ?? null;
    entity.is_minor = dto.isMinor;
    return entity;
  }

  static toRepresentativeEntity(
    clientId: string,
    dto: CreateIndividualClientDto,
    createdBy: string,
  ): RepresentativeEntity {
    const entity = new RepresentativeEntity();
    entity.id = randomUUID();
    entity.client_id = clientId;
    entity.first_name = dto.representativeFirstName!;
    entity.middle_name = dto.representativeMiddleName ?? null;
    entity.last_name = dto.representativeLastName!;
    entity.id_type = dto.representativeIdType!;
    entity.id_number = dto.representativeIdNumber!;
    entity.created_by = createdBy;
    entity.updated_by = null;
    return entity;
  }

  static toMinorGuardianEntity(
    clientId: string,
    dto: CreateIndividualClientDto,
  ): MinorGuardianEntity {
    const entity = new MinorGuardianEntity();
    entity.client_id = clientId;
    entity.first_name = dto.responsiblePersonFirstName!;
    entity.middle_name = dto.responsiblePersonMiddleName ?? null;
    entity.last_name = dto.responsiblePersonLastName!;
    return entity;
  }

  static toOrganizationProfileEntity(
    clientId: string,
    dto: CreateOrganizationClientDto,
  ): OrganizationProfileEntity {
    const entity = new OrganizationProfileEntity();
    entity.client_id = clientId;
    entity.organization_name = dto.organizationName;
    entity.organization_type = dto.organizationType;
    entity.organization_type_other = dto.organizationTypeOther ?? null;
    return entity;
  }

  static toOrgRepresentativeEntity(
    clientId: string,
    dto: CreateOrgRepresentativeDto,
    createdBy: string,
  ): OrganizationRepresentativeEntity {
    const entity = new OrganizationRepresentativeEntity();
    entity.client_id = clientId;
    entity.first_name = dto.firstName;
    entity.middle_name = dto.middleName ?? null;
    entity.last_name = dto.lastName;
    entity.id_type = dto.idType;
    entity.id_number = dto.idNumber;
    entity.phone = dto.phone;
    entity.email = dto.email ?? null;
    entity.province = dto.province;
    entity.municipality = dto.municipality;
    entity.neighborhood = dto.neighborhood;
    entity.street = dto.street;
    entity.plot_number = dto.plotNumber;
    entity.signatory_type = dto.signatoryType;
    entity.role = dto.role;
    entity.gender = null;
    entity.date_of_birth = null;
    entity.place_of_birth = null;
    entity.province_of_origin = null;
    entity.marital_status = null;
    entity.profession = null;
    entity.created_by = createdBy;
    entity.updated_by = null;
    return entity;
  }
}

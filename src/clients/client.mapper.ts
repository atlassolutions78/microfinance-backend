import { randomUUID } from 'crypto';
import {
  ClientEntity,
  IndividualProfileEntity,
  MinorGuardianEntity,
  RepresentativeEntity,
} from './client.entity';
import { ClientModel } from './client.model';
import { CreateIndividualClientDto } from './client.dto';

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
}

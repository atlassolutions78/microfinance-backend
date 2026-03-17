import { ClientEntity } from './client.entity';
import { ClientModel } from './client.model';

/**
 * Translates between ClientEntity (DB) and ClientModel (domain).
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
}

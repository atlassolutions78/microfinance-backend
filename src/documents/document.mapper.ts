import {
  ClientDocumentEntity,
  RepresentativeDocumentEntity,
  GuardianDocumentEntity,
  OrgRepresentativeDocumentEntity,
} from './document.entity';
import { DocumentModel } from './document.model';

export class DocumentMapper {
  static fromClientEntity(entity: ClientDocumentEntity): DocumentModel {
    return new DocumentModel({
      id: entity.id,
      ownerType: 'CLIENT',
      ownerId: entity.client_id,
      documentType: entity.document_type,
      fileName: entity.file_name,
      fileUrl: entity.file_url,
      status: entity.status,
      rejectionReason: entity.rejection_reason,
      uploadedBy: entity.uploaded_by,
      reviewedBy: entity.reviewed_by,
      reviewedAt: entity.reviewed_at,
      uploadedAt: entity.uploaded_at,
    });
  }

  static fromRepresentativeEntity(
    entity: RepresentativeDocumentEntity,
  ): DocumentModel {
    return new DocumentModel({
      id: entity.id,
      ownerType: 'REPRESENTATIVE',
      ownerId: entity.representative_id,
      documentType: entity.document_type,
      fileName: entity.file_name,
      fileUrl: entity.file_url,
      status: entity.status,
      rejectionReason: entity.rejection_reason,
      uploadedBy: entity.uploaded_by,
      reviewedBy: entity.reviewed_by,
      reviewedAt: entity.reviewed_at,
      uploadedAt: entity.uploaded_at,
    });
  }

  static fromGuardianEntity(entity: GuardianDocumentEntity): DocumentModel {
    return new DocumentModel({
      id: entity.id,
      ownerType: 'GUARDIAN',
      ownerId: entity.guardian_id,
      documentType: entity.document_type,
      fileName: entity.file_name,
      fileUrl: entity.file_url,
      status: entity.status,
      rejectionReason: entity.rejection_reason,
      uploadedBy: entity.uploaded_by,
      reviewedBy: entity.reviewed_by,
      reviewedAt: entity.reviewed_at,
      uploadedAt: entity.uploaded_at,
    });
  }

  static toClientEntity(model: DocumentModel): ClientDocumentEntity {
    const entity = new ClientDocumentEntity();
    entity.id = model.id;
    entity.client_id = model.ownerId;
    entity.document_type = model.documentType as any;
    entity.file_name = model.fileName;
    entity.file_url = model.fileUrl;
    entity.status = model.status;
    entity.rejection_reason = model.rejectionReason;
    entity.uploaded_by = model.uploadedBy;
    entity.reviewed_by = model.reviewedBy;
    entity.reviewed_at = model.reviewedAt;
    return entity;
  }

  static toRepresentativeEntity(
    model: DocumentModel,
  ): RepresentativeDocumentEntity {
    const entity = new RepresentativeDocumentEntity();
    entity.id = model.id;
    entity.representative_id = model.ownerId;
    entity.document_type = model.documentType as any;
    entity.file_name = model.fileName;
    entity.file_url = model.fileUrl;
    entity.status = model.status;
    entity.rejection_reason = model.rejectionReason;
    entity.uploaded_by = model.uploadedBy;
    entity.reviewed_by = model.reviewedBy;
    entity.reviewed_at = model.reviewedAt;
    return entity;
  }

  static toGuardianEntity(model: DocumentModel): GuardianDocumentEntity {
    const entity = new GuardianDocumentEntity();
    entity.id = model.id;
    entity.guardian_id = model.ownerId;
    entity.document_type = model.documentType as any;
    entity.file_name = model.fileName;
    entity.file_url = model.fileUrl;
    entity.status = model.status;
    entity.rejection_reason = model.rejectionReason;
    entity.uploaded_by = model.uploadedBy;
    entity.reviewed_by = model.reviewedBy;
    entity.reviewed_at = model.reviewedAt;
    return entity;
  }

  static fromOrgRepresentativeEntity(
    entity: OrgRepresentativeDocumentEntity,
  ): DocumentModel {
    return new DocumentModel({
      id: entity.id,
      ownerType: 'ORG_REPRESENTATIVE',
      ownerId: entity.org_representative_id,
      documentType: entity.document_type,
      fileName: entity.file_name,
      fileUrl: entity.file_url,
      status: entity.status,
      rejectionReason: entity.rejection_reason,
      uploadedBy: entity.uploaded_by,
      reviewedBy: entity.reviewed_by,
      reviewedAt: entity.reviewed_at,
      uploadedAt: entity.uploaded_at,
    });
  }

  static toOrgRepresentativeEntity(
    model: DocumentModel,
  ): OrgRepresentativeDocumentEntity {
    const entity = new OrgRepresentativeDocumentEntity();
    entity.id = model.id;
    entity.org_representative_id = model.ownerId;
    entity.document_type = model.documentType as any;
    entity.file_name = model.fileName;
    entity.file_url = model.fileUrl;
    entity.status = model.status;
    entity.rejection_reason = model.rejectionReason;
    entity.uploaded_by = model.uploadedBy;
    entity.reviewed_by = model.reviewedBy;
    entity.reviewed_at = model.reviewedAt;
    return entity;
  }
}

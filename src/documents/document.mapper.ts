import { DocumentEntity } from './document.entity';
import { DocumentModel } from './document.model';

export class DocumentMapper {
  static toDomain(entity: DocumentEntity): DocumentModel {
    return new DocumentModel({
      id: entity.id,
      documentType: entity.document_type,
      filePath: entity.file_path,
      fileName: entity.file_name,
      originalName: entity.original_name,
      mimeType: entity.mime_type,
      fileSizeBytes: entity.file_size_bytes,
      ownerType: entity.owner_type,
      ownerId: entity.owner_id,
      uploadedBy: entity.uploaded_by,
      uploadedAt: entity.uploaded_at,
      isVerified: entity.is_verified,
      verifiedBy: entity.verified_by ?? undefined,
      verifiedAt: entity.verified_at ?? undefined,
    });
  }

  static toEntity(model: DocumentModel): DocumentEntity {
    const entity = new DocumentEntity();
    entity.id = model.id;
    entity.document_type = model.documentType;
    entity.file_path = model.filePath;
    entity.file_name = model.fileName;
    entity.original_name = model.originalName;
    entity.mime_type = model.mimeType;
    entity.file_size_bytes = model.fileSizeBytes;
    entity.owner_type = model.ownerType;
    entity.owner_id = model.ownerId;
    entity.uploaded_by = model.uploadedBy;
    entity.is_verified = model.isVerified;
    entity.verified_by = model.verifiedBy ?? null;
    entity.verified_at = model.verifiedAt ?? null;
    return entity;
  }
}

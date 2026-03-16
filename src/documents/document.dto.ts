import { IsEnum, IsUUID } from 'class-validator';
import { DocumentOwnerType, DocumentType } from './document.enums';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsEnum(DocumentOwnerType)
  ownerType: DocumentOwnerType;

  @IsUUID()
  ownerId: string;
}

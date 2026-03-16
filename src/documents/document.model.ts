import { DocumentType, DocumentOwnerType } from './document.enums';

export interface DocumentModelProps {
  id: string;
  documentType: DocumentType;
  filePath: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  ownerType: DocumentOwnerType;
  ownerId: string;
  uploadedBy: string;
  uploadedAt: Date;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

/**
 * Document domain model.
 * No NestJS, no TypeORM — pure TypeScript.
 */
export class DocumentModel {
  readonly id: string;
  readonly documentType: DocumentType;
  readonly filePath: string;
  readonly fileName: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly fileSizeBytes: number;
  readonly ownerType: DocumentOwnerType;
  readonly ownerId: string;
  readonly uploadedBy: string;
  readonly uploadedAt: Date;

  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;

  constructor(props: DocumentModelProps) {
    this.id = props.id;
    this.documentType = props.documentType;
    this.filePath = props.filePath;
    this.fileName = props.fileName;
    this.originalName = props.originalName;
    this.mimeType = props.mimeType;
    this.fileSizeBytes = props.fileSizeBytes;
    this.ownerType = props.ownerType;
    this.ownerId = props.ownerId;
    this.uploadedBy = props.uploadedBy;
    this.uploadedAt = props.uploadedAt;
    this.isVerified = props.isVerified;
    this.verifiedBy = props.verifiedBy;
    this.verifiedAt = props.verifiedAt;
  }

  verify(officerId: string): void {
    if (this.isVerified) throw new Error('Document is already verified.');
    this.isVerified = true;
    this.verifiedBy = officerId;
    this.verifiedAt = new Date();
  }
}

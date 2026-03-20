import {
  ClientDocumentType,
  RepresentativeDocumentType,
  GuardianDocumentType,
  OrgRepresentativeDocumentType,
  DocumentStatus,
} from './document.enums';

export type AnyDocumentType =
  | ClientDocumentType
  | RepresentativeDocumentType
  | GuardianDocumentType
  | OrgRepresentativeDocumentType;

export type DocumentOwnerType =
  | 'CLIENT'
  | 'REPRESENTATIVE'
  | 'GUARDIAN'
  | 'ORG_REPRESENTATIVE';

export interface DocumentModelProps {
  id: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  documentType: AnyDocumentType;
  fileName: string;
  fileUrl: string;
  status: DocumentStatus;
  rejectionReason: string | null;
  uploadedBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  uploadedAt: Date;
}

/**
 * Document domain model — shared across all three document tables.
 * No NestJS, no TypeORM — pure TypeScript.
 */
export class DocumentModel {
  readonly id: string;
  readonly ownerType: DocumentOwnerType;
  readonly ownerId: string;
  readonly documentType: AnyDocumentType;
  readonly fileName: string;
  readonly fileUrl: string;
  readonly uploadedBy: string;
  readonly uploadedAt: Date;

  status: DocumentStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;

  constructor(props: DocumentModelProps) {
    this.id = props.id;
    this.ownerType = props.ownerType;
    this.ownerId = props.ownerId;
    this.documentType = props.documentType;
    this.fileName = props.fileName;
    this.fileUrl = props.fileUrl;
    this.status = props.status;
    this.rejectionReason = props.rejectionReason;
    this.uploadedBy = props.uploadedBy;
    this.reviewedBy = props.reviewedBy;
    this.reviewedAt = props.reviewedAt;
    this.uploadedAt = props.uploadedAt;
  }

  accept(officerId: string): void {
    if (this.status !== DocumentStatus.PENDING) {
      throw new Error(`Cannot accept a document in status: ${this.status}`);
    }
    this.status = DocumentStatus.ACCEPTED;
    this.reviewedBy = officerId;
    this.reviewedAt = new Date();
    this.rejectionReason = null;
  }

  reject(officerId: string, reason: string): void {
    if (this.status !== DocumentStatus.PENDING) {
      throw new Error(`Cannot reject a document in status: ${this.status}`);
    }
    this.status = DocumentStatus.REJECTED;
    this.reviewedBy = officerId;
    this.reviewedAt = new Date();
    this.rejectionReason = reason;
  }
}

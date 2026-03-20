import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import {
  ClientDocumentType,
  RepresentativeDocumentType,
  GuardianDocumentType,
  OrgRepresentativeDocumentType,
  DocumentStatus,
} from './document.enums';

@Entity('client_documents')
export class ClientDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id: string;

  @Column({ name: 'document_type', type: 'enum', enum: ClientDocumentType })
  document_type: ClientDocumentType;

  @Column({ name: 'file_name', type: 'text' })
  file_name: string;

  @Column({ name: 'file_url', type: 'text' })
  file_url: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploaded_by: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploaded_at: Date;
}

// ---------------------------------------------------------------------------

@Entity('representative_documents')
export class RepresentativeDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'representative_id', type: 'uuid' })
  representative_id: string;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: RepresentativeDocumentType,
  })
  document_type: RepresentativeDocumentType;

  @Column({ name: 'file_name', type: 'text' })
  file_name: string;

  @Column({ name: 'file_url', type: 'text' })
  file_url: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploaded_by: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploaded_at: Date;
}

// ---------------------------------------------------------------------------

@Entity('organization_representative_documents')
export class OrgRepresentativeDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_representative_id', type: 'uuid' })
  org_representative_id: string;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: OrgRepresentativeDocumentType,
  })
  document_type: OrgRepresentativeDocumentType;

  @Column({ name: 'file_name', type: 'text' })
  file_name: string;

  @Column({ name: 'file_url', type: 'text' })
  file_url: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploaded_by: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploaded_at: Date;
}

// ---------------------------------------------------------------------------

@Entity('guardian_documents')
export class GuardianDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guardian_id', type: 'uuid' })
  guardian_id: string;

  @Column({ name: 'document_type', type: 'enum', enum: GuardianDocumentType })
  document_type: GuardianDocumentType;

  @Column({ name: 'file_name', type: 'text' })
  file_name: string;

  @Column({ name: 'file_url', type: 'text' })
  file_url: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploaded_by: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploaded_at: Date;
}

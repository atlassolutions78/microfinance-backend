import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { DocumentType, DocumentOwnerType } from './document.enums';

/**
 * Stores metadata for an uploaded file.
 * The actual bytes are written to disk (UPLOAD_DIR) by the service.
 */
@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_type', type: 'enum', enum: DocumentType })
  document_type: DocumentType;

  /** Relative path within UPLOAD_DIR, e.g. "clients/abc123/id-scan.jpg" */
  @Column({ name: 'file_path', length: 500 })
  file_path: string;

  @Column({ name: 'file_name', length: 255 })
  file_name: string;

  @Column({ name: 'original_name', length: 255 })
  original_name: string;

  @Column({ name: 'mime_type', length: 100 })
  mime_type: string;

  @Column({ name: 'file_size_bytes', type: 'int' })
  file_size_bytes: number;

  @Column({ name: 'owner_type', type: 'enum', enum: DocumentOwnerType })
  owner_type: DocumentOwnerType;

  /** UUID of the owning entity (client_id, representative_id, or guardian_id) */
  @Column({ name: 'owner_id', type: 'uuid' })
  owner_id: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploaded_by: string;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploaded_at: Date;

  @Column({ name: 'is_verified', default: false })
  is_verified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verified_by: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verified_at: Date | null;
}

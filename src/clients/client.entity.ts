import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  ClientType,
  KycStatus,
  Gender,
  IdType,
  MaritalStatus,
  OrganizationType,
  SignatoryType,
} from './client.enums';

/**
 * Main client record — one row per client regardless of type.
 */
@Entity('clients')
export class ClientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_number', unique: true, type: 'text' })
  client_number: string;

  @Column({ name: 'type', type: 'enum', enum: ClientType })
  type: ClientType;

  @Column({
    name: 'kyc_status',
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  kyc_status: KycStatus;

  @Column({ name: 'branch_id', type: 'uuid' })
  branch_id: string;

  @Column({ name: 'created_by', type: 'uuid' })
  created_by: string;

  @Column({ name: 'kyc_reviewed_by', type: 'uuid', nullable: true })
  kyc_reviewed_by: string | null;

  @Column({ name: 'kyc_reviewed_at', type: 'timestamptz', nullable: true })
  kyc_reviewed_at: Date | null;

  @Column({ name: 'kyc_notes', type: 'text', nullable: true })
  kyc_notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

// ---------------------------------------------------------------------------

@Entity('individual_profiles')
export class IndividualProfileEntity {
  @PrimaryColumn({ name: 'client_id', type: 'uuid' })
  client_id: string;

  @OneToOne(() => ClientEntity)
  @JoinColumn({ name: 'client_id' })
  client: ClientEntity;

  @Column({ name: 'first_name', type: 'text' })
  first_name: string;

  @Column({ name: 'middle_name', type: 'text', nullable: true })
  middle_name: string | null;

  @Column({ name: 'last_name', type: 'text' })
  last_name: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  date_of_birth: Date;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'text' })
  nationality: string;

  @Column({ name: 'marital_status', type: 'enum', enum: MaritalStatus })
  marital_status: MaritalStatus;

  @Column({ type: 'text' })
  profession: string;

  @Column({ type: 'text' })
  province: string;

  @Column({ type: 'text' })
  municipality: string;

  @Column({ type: 'text' })
  neighborhood: string;

  @Column({ type: 'text' })
  street: string;

  @Column({ name: 'plot_number', type: 'text' })
  plot_number: string;

  @Column({ type: 'text' })
  phone: string;

  @Column({ name: 'id_type', type: 'enum', enum: IdType })
  id_type: IdType;

  @Column({ name: 'id_number', type: 'text' })
  id_number: string;

  @Column({ name: 'is_minor', default: false })
  is_minor: boolean;

  @Column({ name: 'responsible_adult_name', type: 'text', nullable: true })
  responsible_adult_name: string | null;

  @Column({ name: 'responsible_adult_id', type: 'text', nullable: true })
  responsible_adult_id: string | null;
}

// ---------------------------------------------------------------------------

@Entity('minor_guardians')
export class MinorGuardianEntity {
  @PrimaryGeneratedColumn('uuid')
  guardian_id: string;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id: string;

  @ManyToOne(() => ClientEntity)
  @JoinColumn({ name: 'client_id' })
  client: ClientEntity;

  @Column({ name: 'first_name', type: 'text' })
  first_name: string;

  @Column({ name: 'middle_name', type: 'text', nullable: true })
  middle_name: string | null;

  @Column({ name: 'last_name', type: 'text' })
  last_name: string;

  @Column({ name: 'id_document_ref', type: 'text' })
  id_document_ref: string;
}

// ---------------------------------------------------------------------------

@Entity('organization_profiles')
export class OrganizationProfileEntity {
  @PrimaryColumn({ name: 'client_id', type: 'uuid' })
  client_id: string;

  @OneToOne(() => ClientEntity)
  @JoinColumn({ name: 'client_id' })
  client: ClientEntity;

  @Column({ name: 'organization_type', type: 'enum', enum: OrganizationType })
  organization_type: OrganizationType;

  @Column({ name: 'organization_type_other', type: 'text', nullable: true })
  organization_type_other: string | null;

  @Column({ name: 'organization_name', type: 'text' })
  organization_name: string;

  @Column({ name: 'mandatory_signatories', type: 'int' })
  mandatory_signatories: number;

  @Column({ name: 'optional_signatories', type: 'int' })
  optional_signatories: number;
}

// ---------------------------------------------------------------------------

@Entity('representatives')
export class RepresentativeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id: string;

  @ManyToOne(() => ClientEntity)
  @JoinColumn({ name: 'client_id' })
  client: ClientEntity;

  @Column({ name: 'first_name', type: 'text' })
  first_name: string;

  @Column({ name: 'middle_name', type: 'text', nullable: true })
  middle_name: string | null;

  @Column({ name: 'last_name', type: 'text' })
  last_name: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  date_of_birth: Date | null;

  @Column({ name: 'place_of_birth', type: 'text', nullable: true })
  place_of_birth: string | null;

  @Column({ name: 'province_of_origin', type: 'text', nullable: true })
  province_of_origin: string | null;

  @Column({
    name: 'marital_status',
    type: 'enum',
    enum: MaritalStatus,
    nullable: true,
  })
  marital_status: MaritalStatus | null;

  @Column({ type: 'text', nullable: true })
  profession: string | null;

  @Column({
    name: 'id_type',
    type: 'enum',
    enum: IdType,
    nullable: true,
  })
  id_type: IdType | null;

  @Column({ name: 'id_number', type: 'text' })
  id_number: string;

  @Column({ type: 'text' })
  province: string;

  @Column({ type: 'text' })
  municipality: string;

  @Column({ type: 'text' })
  neighborhood: string;

  @Column({ type: 'text' })
  street: string;

  @Column({ name: 'plot_number', type: 'text' })
  plot_number: string;

  @Column({ type: 'text' })
  phone: string;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ name: 'signatory_type', type: 'enum', enum: SignatoryType })
  signatory_type: SignatoryType;

  @Column({ type: 'text', nullable: true })
  role: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

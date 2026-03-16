import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  ClientType,
  ClientStatus,
  KycStatus,
  Gender,
  IdType,
  SignaturePolicy,
  GuardianRelationship,
} from './client.enums';

/**
 * Main client record — one row per client regardless of type.
 */
@Entity('clients')
export class ClientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_number', unique: true, length: 20 })
  client_number: string;

  @Column({ name: 'client_type', type: 'enum', enum: ClientType })
  client_type: ClientType;

  @Column({ type: 'enum', enum: ClientStatus, default: ClientStatus.ACTIVE })
  status: ClientStatus;

  @Column({ name: 'kyc_status', type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  kyc_status: KycStatus;

  @Column({ name: 'kyc_verified_by', nullable: true, type: 'uuid' })
  kyc_verified_by: string | null;

  @Column({ name: 'kyc_verified_at', type: 'timestamptz', nullable: true })
  kyc_verified_at: Date | null;

  @Column({ name: 'kyc_rejection_reason', type: 'text', nullable: true })
  kyc_rejection_reason: string | null;

  @Column({ name: 'kyc_expiry_date', type: 'date', nullable: true })
  kyc_expiry_date: Date | null;

  @Column({ name: 'created_by', type: 'uuid' })
  created_by: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  // --- Relations ---

  @OneToOne(() => IndividualDetailsEntity, (d) => d.client, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'individual_details_id' })
  individual_details: IndividualDetailsEntity | null;

  @OneToOne(() => BusinessDetailsEntity, (d) => d.client, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'business_details_id' })
  business_details: BusinessDetailsEntity | null;

  @OneToOne(() => GuardianEntity, (g) => g.client, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'guardian_id' })
  guardian: GuardianEntity | null;

  @OneToMany(() => RepresentativeEntity, (r) => r.client, {
    cascade: true,
    eager: true,
  })
  representatives: RepresentativeEntity[];
}

// ---------------------------------------------------------------------------

@Entity('individual_details')
export class IndividualDetailsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => ClientEntity, (c) => c.individual_details)
  client: ClientEntity;

  @Column({ name: 'first_name', length: 100 })
  first_name: string;

  @Column({ name: 'last_name', length: 100 })
  last_name: string;

  @Column({ name: 'middle_name', type: 'varchar', length: 100, nullable: true })
  middle_name: string | null;

  @Column({ name: 'date_of_birth', type: 'date' })
  date_of_birth: Date;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ length: 100 })
  nationality: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'address_line1', length: 255 })
  address_line1: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  address_line2: string | null;

  @Column({ length: 100 })
  city: string;

  @Column({ name: 'state_province', type: 'varchar', length: 100, nullable: true })
  state_province: string | null;

  @Column({ length: 100 })
  country: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postal_code: string | null;

  @Column({ name: 'id_type', type: 'enum', enum: IdType })
  id_type: IdType;

  @Column({ name: 'id_number', length: 100, unique: true })
  id_number: string;

  @Column({ name: 'id_expiry_date', type: 'date' })
  id_expiry_date: Date;

  @Column({ name: 'is_minor', default: false })
  is_minor: boolean;
}

// ---------------------------------------------------------------------------

@Entity('guardians')
export class GuardianEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => ClientEntity, (c) => c.guardian)
  client: ClientEntity;

  @Column({ name: 'first_name', length: 100 })
  first_name: string;

  @Column({ name: 'last_name', length: 100 })
  last_name: string;

  @Column({ type: 'enum', enum: GuardianRelationship })
  relationship: GuardianRelationship;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'id_type', type: 'enum', enum: IdType })
  id_type: IdType;

  @Column({ name: 'id_number', length: 100 })
  id_number: string;

  @Column({ name: 'id_expiry_date', type: 'date' })
  id_expiry_date: Date;
}

// ---------------------------------------------------------------------------

@Entity('business_details')
export class BusinessDetailsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => ClientEntity, (c) => c.business_details)
  client: ClientEntity;

  @Column({ name: 'company_name', length: 255 })
  company_name: string;

  @Column({ name: 'registration_number', length: 100, unique: true })
  registration_number: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 100, nullable: true })
  tax_id: string | null;

  @Column({ name: 'business_type', type: 'varchar', length: 100, nullable: true })
  business_type: string | null;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'address_line1', length: 255 })
  address_line1: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  address_line2: string | null;

  @Column({ length: 100 })
  city: string;

  @Column({ name: 'state_province', type: 'varchar', length: 100, nullable: true })
  state_province: string | null;

  @Column({ length: 100 })
  country: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postal_code: string | null;

  @Column({
    name: 'signature_policy',
    type: 'enum',
    enum: SignaturePolicy,
    default: SignaturePolicy.SINGLE,
  })
  signature_policy: SignaturePolicy;
}

// ---------------------------------------------------------------------------

@Entity('representatives')
export class RepresentativeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ClientEntity, (c) => c.representatives)
  @JoinColumn({ name: 'client_id' })
  client: ClientEntity;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id: string;

  @Column({ name: 'first_name', length: 100 })
  first_name: string;

  @Column({ name: 'last_name', length: 100 })
  last_name: string;

  @Column({ length: 100 })
  role: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'id_type', type: 'enum', enum: IdType })
  id_type: IdType;

  @Column({ name: 'id_number', length: 100 })
  id_number: string;

  @Column({ name: 'id_expiry_date', type: 'date' })
  id_expiry_date: Date;

  @Column({ name: 'is_primary_signatory', default: false })
  is_primary_signatory: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}

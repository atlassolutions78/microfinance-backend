import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole, UserStatus } from './user.enums';

/**
 * Represents a system user (staff account) as stored in the database.
 * Used by the auth module for login/session management.
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branch_id: string | null;

  @Column({ name: 'first_name', length: 100 })
  first_name: string;

  @Column({ name: 'middle_name', type: 'varchar', length: 100, nullable: true })
  middle_name: string | null;

  @Column({ name: 'last_name', length: 100 })
  last_name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  password_hash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'invitation_token', type: 'varchar', length: 255, nullable: true, unique: true })
  invitation_token: string | null;

  @Column({ name: 'invitation_expires_at', type: 'timestamptz', nullable: true })
  invitation_expires_at: Date | null;

  @Column({ name: 'must_change_password', default: false })
  must_change_password: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

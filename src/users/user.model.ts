import { UserRole, UserStatus } from './user.enums';

export interface UserModelProps {
  id: string;
  branchId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain model for a system user account.
 * No NestJS, no TypeORM — pure TypeScript.
 */
export class UserModel {
  readonly id: string;
  readonly firstName: string;
  readonly middleName: string | null;
  readonly lastName: string;
  readonly email: string;
  readonly createdAt: Date;

  branchId: string | null;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  mustChangePassword: boolean;
  updatedAt: Date;

  constructor(props: UserModelProps) {
    this.id = props.id;
    this.branchId = props.branchId;
    this.firstName = props.firstName;
    this.middleName = props.middleName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.status = props.status;
    this.invitationToken = props.invitationToken;
    this.invitationExpiresAt = props.invitationExpiresAt;
    this.mustChangePassword = props.mustChangePassword;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  deactivate(): void {
    if (this.status === UserStatus.INACTIVE) throw new Error('User is already inactive.');
    this.status = UserStatus.INACTIVE;
    this.updatedAt = new Date();
  }

  activate(): void {
    if (this.status === UserStatus.ACTIVE) throw new Error('User is already active.');
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  changeRole(newRole: UserRole): void {
    this.role = newRole;
    this.updatedAt = new Date();
  }

  resetPassword(newPasswordHash: string): void {
    this.passwordHash = newPasswordHash;
    this.mustChangePassword = true;
    this.updatedAt = new Date();
  }

  reassignBranch(branchId: string | null): void {
    this.branchId = branchId;
    this.updatedAt = new Date();
  }
}

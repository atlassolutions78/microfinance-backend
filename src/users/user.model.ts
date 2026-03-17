import { UserRole } from './user.enums';

export interface UserModelProps {
  id: string;
  branchId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain model for a system user account.
 * No NestJS, no TypeORM — pure TypeScript.
 */
export class UserModel {
  readonly id: string;
  readonly branchId: string | null;
  readonly firstName: string;
  readonly middleName: string | null;
  readonly lastName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: Date;

  role: UserRole;
  isActive: boolean;
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
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  deactivate(): void {
    if (!this.isActive) throw new Error('User is already inactive.');
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate(): void {
    if (this.isActive) throw new Error('User is already active.');
    this.isActive = true;
    this.updatedAt = new Date();
  }

  changeRole(newRole: UserRole): void {
    this.role = newRole;
    this.updatedAt = new Date();
  }
}

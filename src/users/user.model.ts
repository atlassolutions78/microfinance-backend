import { UserRole } from './user.enums';

export interface UserModelProps {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
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
  readonly username: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly fullName: string;
  readonly createdAt: Date;

  role: UserRole;
  isActive: boolean;
  updatedAt: Date;

  constructor(props: UserModelProps) {
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.fullName = props.fullName;
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

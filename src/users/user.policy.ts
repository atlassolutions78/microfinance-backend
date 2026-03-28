import { ForbiddenException } from '@nestjs/common';
import { UserRole } from './user.enums';

const BRANCH_MANAGER_ALLOWED_ROLES: UserRole[] = [
  UserRole.TELLER,
  UserRole.LOAN_OFFICER,
];

export class UserPolicy {
  /**
   * Enforces which roles are allowed to create users with a given target role.
   * Only ADMIN can create ADMIN or HQ_MANAGER.
   * BRANCH_MANAGER can only create TELLER or LOAN_OFFICER.
   */
  static assertCanCreateRole(actorRole: UserRole, targetRole: UserRole): void {
    if (actorRole === UserRole.ADMIN) return;

    if (actorRole === UserRole.BRANCH_MANAGER) {
      if (BRANCH_MANAGER_ALLOWED_ROLES.includes(targetRole)) return;
      throw new ForbiddenException(
        `BRANCH_MANAGER can only create users with role TELLER or LOAN_OFFICER.`,
      );
    }

    throw new ForbiddenException('You do not have permission to create users.');
  }

  /**
   * Enforces branch assignment rules.
   * BRANCH_MANAGER can only assign users to their own branch.
   */
  static assertCanAssignBranch(
    actorRole: UserRole,
    actorBranchId: string | null,
    targetBranchId: string | null,
  ): void {
    if (actorRole === UserRole.ADMIN) return;

    if (actorRole === UserRole.BRANCH_MANAGER) {
      if (targetBranchId === actorBranchId) return;
      throw new ForbiddenException(
        'BRANCH_MANAGER can only assign users to their own branch.',
      );
    }
  }

  /**
   * Prevents a user from performing a self-targeting action (e.g., deactivating themselves).
   */
  static assertNotSelf(actorId: string, targetId: string): void {
    if (actorId === targetId) {
      throw new ForbiddenException('You cannot perform this action on your own account.');
    }
  }
}

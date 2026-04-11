import { ForbiddenException } from '@nestjs/common';
import { UserPolicy } from './user.policy';
import { UserRole } from './user.enums';

describe('UserPolicy', () => {
  describe('assertCanCreateRole', () => {
    it('allows ADMIN to create any role', () => {
      const allRoles = Object.values(UserRole);
      for (const role of allRoles) {
        expect(() =>
          UserPolicy.assertCanCreateRole(UserRole.ADMIN, role),
        ).not.toThrow();
      }
    });

    it('allows BRANCH_MANAGER to create TELLER', () => {
      expect(() =>
        UserPolicy.assertCanCreateRole(UserRole.BRANCH_MANAGER, UserRole.TELLER),
      ).not.toThrow();
    });

    it('allows BRANCH_MANAGER to create LOAN_OFFICER', () => {
      expect(() =>
        UserPolicy.assertCanCreateRole(
          UserRole.BRANCH_MANAGER,
          UserRole.LOAN_OFFICER,
        ),
      ).not.toThrow();
    });

    it('throws ForbiddenException if BRANCH_MANAGER tries to create BRANCH_MANAGER', () => {
      expect(() =>
        UserPolicy.assertCanCreateRole(
          UserRole.BRANCH_MANAGER,
          UserRole.BRANCH_MANAGER,
        ),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if BRANCH_MANAGER tries to create HQ_MANAGER', () => {
      expect(() =>
        UserPolicy.assertCanCreateRole(
          UserRole.BRANCH_MANAGER,
          UserRole.HQ_MANAGER,
        ),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if BRANCH_MANAGER tries to create ADMIN', () => {
      expect(() =>
        UserPolicy.assertCanCreateRole(UserRole.BRANCH_MANAGER, UserRole.ADMIN),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if TELLER tries to create any user', () => {
      expect(() =>
        UserPolicy.assertCanCreateRole(UserRole.TELLER, UserRole.TELLER),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if HQ_MANAGER tries to create any user', () => {
      expect(() =>
        UserPolicy.assertCanCreateRole(UserRole.HQ_MANAGER, UserRole.TELLER),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertCanAssignBranch', () => {
    const branchA = 'branch-a';
    const branchB = 'branch-b';

    it('allows ADMIN to assign any branch', () => {
      expect(() =>
        UserPolicy.assertCanAssignBranch(UserRole.ADMIN, branchA, branchB),
      ).not.toThrow();
    });

    it('allows ADMIN to assign null branch', () => {
      expect(() =>
        UserPolicy.assertCanAssignBranch(UserRole.ADMIN, null, null),
      ).not.toThrow();
    });

    it('allows BRANCH_MANAGER to assign their own branch', () => {
      expect(() =>
        UserPolicy.assertCanAssignBranch(UserRole.BRANCH_MANAGER, branchA, branchA),
      ).not.toThrow();
    });

    it('throws ForbiddenException if BRANCH_MANAGER assigns a different branch', () => {
      expect(() =>
        UserPolicy.assertCanAssignBranch(UserRole.BRANCH_MANAGER, branchA, branchB),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if BRANCH_MANAGER assigns null branch', () => {
      expect(() =>
        UserPolicy.assertCanAssignBranch(UserRole.BRANCH_MANAGER, branchA, null),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertNotSelf', () => {
    it('throws ForbiddenException if actorId equals targetId', () => {
      expect(() => UserPolicy.assertNotSelf('user-1', 'user-1')).toThrow(
        ForbiddenException,
      );
    });

    it('does nothing if actorId differs from targetId', () => {
      expect(() => UserPolicy.assertNotSelf('user-1', 'user-2')).not.toThrow();
    });
  });
});

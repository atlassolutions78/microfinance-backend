import { UserModel, UserModelProps } from './user.model';
import { UserRole } from './user.enums';

function baseProps(overrides: Partial<UserModelProps> = {}): UserModelProps {
  return {
    id: 'user-1',
    branchId: 'branch-1',
    firstName: 'John',
    middleName: null,
    lastName: 'Doe',
    email: 'john@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.TELLER,
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('UserModel', () => {
  describe('deactivate', () => {
    it('sets isActive to false', () => {
      const user = new UserModel(baseProps({ isActive: true }));
      user.deactivate();
      expect(user.isActive).toBe(false);
    });

    it('updates updatedAt', () => {
      const before = new Date('2024-01-01');
      const user = new UserModel(baseProps({ isActive: true, updatedAt: before }));
      user.deactivate();
      expect(user.updatedAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('throws if already inactive', () => {
      const user = new UserModel(baseProps({ isActive: false }));
      expect(() => user.deactivate()).toThrow('User is already inactive.');
    });
  });

  describe('activate', () => {
    it('sets isActive to true', () => {
      const user = new UserModel(baseProps({ isActive: false }));
      user.activate();
      expect(user.isActive).toBe(true);
    });

    it('updates updatedAt', () => {
      const before = new Date('2024-01-01');
      const user = new UserModel(baseProps({ isActive: false, updatedAt: before }));
      user.activate();
      expect(user.updatedAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('throws if already active', () => {
      const user = new UserModel(baseProps({ isActive: true }));
      expect(() => user.activate()).toThrow('User is already active.');
    });
  });

  describe('changeRole', () => {
    it('sets the new role', () => {
      const user = new UserModel(baseProps({ role: UserRole.TELLER }));
      user.changeRole(UserRole.LOAN_OFFICER);
      expect(user.role).toBe(UserRole.LOAN_OFFICER);
    });

    it('updates updatedAt', () => {
      const before = new Date('2024-01-01');
      const user = new UserModel(baseProps({ updatedAt: before }));
      user.changeRole(UserRole.BRANCH_MANAGER);
      expect(user.updatedAt.getTime()).toBeGreaterThan(before.getTime());
    });
  });

  describe('resetPassword', () => {
    it('sets passwordHash to the new value', () => {
      const user = new UserModel(baseProps({ passwordHash: 'old-hash' }));
      user.resetPassword('new-hash');
      expect(user.passwordHash).toBe('new-hash');
    });

    it('sets mustChangePassword to true', () => {
      const user = new UserModel(baseProps({ mustChangePassword: false }));
      user.resetPassword('new-hash');
      expect(user.mustChangePassword).toBe(true);
    });

    it('updates updatedAt', () => {
      const before = new Date('2024-01-01');
      const user = new UserModel(baseProps({ updatedAt: before }));
      user.resetPassword('new-hash');
      expect(user.updatedAt.getTime()).toBeGreaterThan(before.getTime());
    });
  });

  describe('reassignBranch', () => {
    it('sets branchId to the new value', () => {
      const user = new UserModel(baseProps({ branchId: 'old-branch' }));
      user.reassignBranch('new-branch');
      expect(user.branchId).toBe('new-branch');
    });

    it('allows setting branchId to null', () => {
      const user = new UserModel(baseProps({ branchId: 'some-branch' }));
      user.reassignBranch(null);
      expect(user.branchId).toBeNull();
    });

    it('updates updatedAt', () => {
      const before = new Date('2024-01-01');
      const user = new UserModel(baseProps({ updatedAt: before }));
      user.reassignBranch('new-branch');
      expect(user.updatedAt.getTime()).toBeGreaterThan(before.getTime());
    });
  });
});

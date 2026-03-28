import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { BranchRepository } from './branch.repository';
import { UserService } from '../users/user.service';
import { UserModel, UserModelProps } from '../users/user.model';
import { UserRole } from '../users/user.enums';
import { BranchEntity } from './branch.entity';
import { BranchType } from './branch.enums';
import { CreateUserDto, UserFilterDto } from '../users/user.dto';

function makeBranch(overrides: Partial<BranchEntity> = {}): BranchEntity {
  const b = new BranchEntity();
  b.id = 'branch-1';
  b.name = 'Head Office';
  b.code = 'HQ001';
  b.type = BranchType.HEAD;
  b.address = '123 Main St';
  b.phone = null;
  b.is_active = true;
  b.created_by = 'admin-1';
  b.updated_by = null;
  b.created_at = new Date();
  b.updated_at = new Date();
  return Object.assign(b, overrides);
}

function makeActor(overrides: Partial<UserModelProps> = {}): UserModel {
  return new UserModel({
    id: 'actor-1',
    branchId: 'branch-1',
    firstName: 'Admin',
    middleName: null,
    lastName: 'User',
    email: 'admin@example.com',
    passwordHash: 'hash',
    role: UserRole.ADMIN,
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeUserModel(overrides: Partial<UserModelProps> = {}): UserModel {
  return new UserModel({
    id: 'user-1',
    branchId: 'branch-1',
    firstName: 'John',
    middleName: null,
    lastName: 'Doe',
    email: 'john@example.com',
    passwordHash: 'hash',
    role: UserRole.TELLER,
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeRepo(): jest.Mocked<BranchRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<BranchRepository>;
}

function makeUserService(): jest.Mocked<UserService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllFiltered: jest.fn(),
    findById: jest.fn(),
    changeRole: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
    updateUser: jest.fn(),
    resetPassword: jest.fn(),
  } as unknown as jest.Mocked<UserService>;
}

describe('SettingsService', () => {
  let service: SettingsService;
  let branchRepo: jest.Mocked<BranchRepository>;
  let userService: jest.Mocked<UserService>;

  beforeEach(() => {
    branchRepo = makeRepo();
    userService = makeUserService();
    service = new SettingsService(branchRepo, userService);
  });

  describe('activateBranch', () => {
    it('updates is_active to true and returns the updated branch', async () => {
      const branch = makeBranch({ is_active: false });
      branchRepo.findById.mockResolvedValueOnce(branch);
      branchRepo.update.mockResolvedValue(undefined);
      branchRepo.findById.mockResolvedValueOnce({ ...branch, is_active: true } as BranchEntity);

      const result = await service.activateBranch('branch-1', 'actor-1');

      expect(branchRepo.update).toHaveBeenCalledWith('branch-1', {
        is_active: true,
        updated_by: 'actor-1',
      });
      expect(result.is_active).toBe(true);
    });

    it('throws NotFoundException if branch does not exist', async () => {
      branchRepo.findById.mockResolvedValue(null);
      await expect(service.activateBranch('missing', 'actor-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSettingsUser', () => {
    const dto: CreateUserDto = {
      branchId: 'branch-1',
      firstName: 'Jane',
      middleName: null,
      lastName: 'Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: UserRole.TELLER,
    };

    it('calls UserPolicy checks then UserService.create', async () => {
      const actor = makeActor({ role: UserRole.ADMIN });
      const newUser = makeUserModel({ email: 'jane@example.com' });
      userService.create.mockResolvedValue(newUser);

      const result = await service.createSettingsUser(dto, actor);

      expect(userService.create).toHaveBeenCalledWith(dto);
      expect(result.email).toBe('jane@example.com');
    });

    it('throws ForbiddenException if BRANCH_MANAGER tries to create ADMIN', async () => {
      const actor = makeActor({ role: UserRole.BRANCH_MANAGER });
      const adminDto: CreateUserDto = { ...dto, role: UserRole.ADMIN };

      await expect(service.createSettingsUser(adminDto, actor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException if BRANCH_MANAGER assigns a different branch', async () => {
      const actor = makeActor({ role: UserRole.BRANCH_MANAGER, branchId: 'branch-1' });
      const otherBranchDto: CreateUserDto = { ...dto, branchId: 'branch-999', role: UserRole.TELLER };

      await expect(service.createSettingsUser(otherBranchDto, actor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userService.create).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('delegates filters to UserService.findAllFiltered', async () => {
      const filters: UserFilterDto = { role: UserRole.TELLER };
      const users = [makeUserModel()];
      userService.findAllFiltered.mockResolvedValue(users);

      const result = await service.listUsers(filters);

      expect(userService.findAllFiltered).toHaveBeenCalledWith(filters);
      expect(result).toBe(users);
    });
  });

  describe('getSettingsUser', () => {
    it('delegates to UserService.findById', async () => {
      const user = makeUserModel();
      userService.findById.mockResolvedValue(user);

      const result = await service.getSettingsUser('user-1');

      expect(userService.findById).toHaveBeenCalledWith('user-1');
      expect(result).toBe(user);
    });
  });

  describe('deactivateSettingsUser', () => {
    it('throws ForbiddenException if actor targets themselves', async () => {
      const actor = makeActor({ id: 'same-id' });
      await expect(service.deactivateSettingsUser('same-id', actor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userService.deactivate).not.toHaveBeenCalled();
    });

    it('calls UserService.deactivate when actor and target differ', async () => {
      const actor = makeActor({ id: 'actor-1' });
      const user = makeUserModel({ id: 'user-1' });
      userService.deactivate.mockResolvedValue({ ...user, isActive: false } as UserModel);

      await service.deactivateSettingsUser('user-1', actor);

      expect(userService.deactivate).toHaveBeenCalledWith('user-1');
    });
  });

  describe('activateSettingsUser', () => {
    it('delegates to UserService.activate', async () => {
      const user = makeUserModel({ isActive: false });
      userService.activate.mockResolvedValue({ ...user, isActive: true } as UserModel);

      await service.activateSettingsUser('user-1');

      expect(userService.activate).toHaveBeenCalledWith('user-1');
    });
  });

  describe('resetUserPassword', () => {
    it('delegates to UserService.resetPassword', async () => {
      userService.resetPassword.mockResolvedValue({ tempPassword: 'abc123' });

      const result = await service.resetUserPassword('user-1');

      expect(userService.resetPassword).toHaveBeenCalledWith('user-1');
      expect(result.tempPassword).toBe('abc123');
    });
  });
});

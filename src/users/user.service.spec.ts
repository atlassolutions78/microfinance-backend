import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserModel, UserModelProps } from './user.model';
import { UserRole } from './user.enums';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './user.dto';

function makeUser(overrides: Partial<UserModelProps> = {}): UserModel {
  return new UserModel({
    id: 'user-1',
    branchId: 'branch-1',
    firstName: 'John',
    middleName: null,
    lastName: 'Doe',
    email: 'john@example.com',
    passwordHash: 'hashed',
    role: UserRole.TELLER,
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeRepo(): jest.Mocked<UserRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    findAllFiltered: jest.fn(),
    existsByEmail: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
}

describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    repo = makeRepo();
    service = new UserService(repo);
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      branchId: 'branch-1',
      firstName: 'Jane',
      middleName: null,
      lastName: 'Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: UserRole.TELLER,
    };

    it('hashes the password and saves the user', async () => {
      repo.existsByEmail.mockResolvedValue(false);
      repo.save.mockResolvedValue(undefined);

      const result = await service.create(dto);

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result.email).toBe('jane@example.com');
      expect(result.passwordHash).not.toBe('password123');
      expect(result.mustChangePassword).toBe(false);
    });

    it('throws ConflictException if email already exists', async () => {
      repo.existsByEmail.mockResolvedValue(true);
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllFiltered', () => {
    it('delegates filters to repository', async () => {
      const filters: UserFilterDto = { role: UserRole.TELLER, isActive: true };
      repo.findAllFiltered.mockResolvedValue([makeUser()]);

      const result = await service.findAllFiltered(filters);

      expect(repo.findAllFiltered).toHaveBeenCalledWith(filters);
      expect(result).toHaveLength(1);
    });
  });

  describe('changeRole', () => {
    it('calls model.changeRole and saves', async () => {
      const user = makeUser({ role: UserRole.TELLER });
      repo.findById.mockResolvedValue(user);
      repo.save.mockResolvedValue(undefined);

      const result = await service.changeRole('user-1', { role: UserRole.LOAN_OFFICER });

      expect(result.role).toBe(UserRole.LOAN_OFFICER);
      expect(repo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('deactivate', () => {
    it('calls model.deactivate and saves', async () => {
      const user = makeUser({ isActive: true });
      repo.findById.mockResolvedValue(user);
      repo.save.mockResolvedValue(undefined);

      const result = await service.deactivate('user-1');

      expect(result.isActive).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(user);
    });

    it('throws NotFoundException if user not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.deactivate('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('calls model.activate and saves', async () => {
      const user = makeUser({ isActive: false });
      repo.findById.mockResolvedValue(user);
      repo.save.mockResolvedValue(undefined);

      const result = await service.activate('user-1');

      expect(result.isActive).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('updateUser', () => {
    it('changes role when role is provided', async () => {
      const user = makeUser({ role: UserRole.TELLER });
      repo.findById.mockResolvedValue(user);
      repo.save.mockResolvedValue(undefined);

      const dto: UpdateUserDto = { role: UserRole.LOAN_OFFICER };
      const result = await service.updateUser('user-1', dto);

      expect(result.role).toBe(UserRole.LOAN_OFFICER);
    });

    it('reassigns branch when branchId is provided', async () => {
      const user = makeUser({ branchId: 'old-branch' });
      repo.findById.mockResolvedValue(user);
      repo.save.mockResolvedValue(undefined);

      const dto: UpdateUserDto = { branchId: 'new-branch' };
      const result = await service.updateUser('user-1', dto);

      expect(result.branchId).toBe('new-branch');
    });

    it('saves and returns updated model', async () => {
      const user = makeUser();
      repo.findById.mockResolvedValue(user);
      repo.save.mockResolvedValue(undefined);

      await service.updateUser('user-1', { role: UserRole.BRANCH_MANAGER });

      expect(repo.save).toHaveBeenCalledWith(user);
    });

    it('throws NotFoundException if user not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.updateUser('missing', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    it('hashes temp password, calls model.resetPassword, saves, and returns tempPassword', async () => {
      const user = makeUser({ mustChangePassword: false });
      repo.findById.mockResolvedValue(user);
      repo.save.mockResolvedValue(undefined);

      const result = await service.resetPassword('user-1');

      expect(typeof result.tempPassword).toBe('string');
      expect(result.tempPassword.length).toBeGreaterThan(0);
      expect(user.mustChangePassword).toBe(true);
      expect(user.passwordHash).not.toBe('hashed');
      expect(repo.save).toHaveBeenCalledWith(user);
    });

    it('throws NotFoundException if user not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.resetPassword('missing')).rejects.toThrow(NotFoundException);
    });
  });
});

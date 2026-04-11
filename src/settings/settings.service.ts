import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { BranchRepository } from './branch.repository';
import { BranchEntity } from './branch.entity';
import {
  CreateBranchDto,
  UpdateBranchDto,
  CreateSettingsUserDto,
  UpdateSettingsUserDto,
  UserFiltersQuery,
} from './settings.dto';
import { UserRepository } from '../users/user.repository';
import { UserModel } from '../users/user.model';
import { UserRole } from '../users/user.enums';

@Injectable()
export class SettingsService {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly userRepository: UserRepository,
  ) {}

  // ─── Branch ─────────────────────────────────────────────────────────────────

  async createBranch(
    dto: CreateBranchDto,
    createdById: string,
  ): Promise<BranchEntity> {
    return this.branchRepository.save({
      id: randomUUID(),
      name: dto.name,
      code: dto.code,
      type: dto.type,
      address: dto.address,
      phone: dto.phone ?? null,
      is_active: true,
      created_by: createdById,
      updated_by: null,
    });
  }

  async findAllBranches(): Promise<BranchEntity[]> {
    return this.branchRepository.findAll();
  }

  async findBranchById(id: string): Promise<BranchEntity> {
    const branch = await this.branchRepository.findById(id);
    if (!branch) throw new NotFoundException(`Branch ${id} not found.`);
    return branch;
  }

  async updateBranch(
    id: string,
    dto: UpdateBranchDto,
    updatedById: string,
  ): Promise<BranchEntity> {
    await this.findBranchById(id);
    await this.branchRepository.update(id, { ...dto, updated_by: updatedById });
    return this.findBranchById(id);
  }

  async activateBranch(
    id: string,
    updatedById: string,
  ): Promise<BranchEntity> {
    await this.findBranchById(id);
    await this.branchRepository.update(id, {
      is_active: true,
      updated_by: updatedById,
    });
    return this.findBranchById(id);
  }

  async deactivateBranch(
    id: string,
    updatedById: string,
  ): Promise<BranchEntity> {
    await this.findBranchById(id);
    await this.branchRepository.update(id, {
      is_active: false,
      updated_by: updatedById,
    });
    return this.findBranchById(id);
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async createUser(
    dto: CreateSettingsUserDto,
    actor: UserModel,
  ): Promise<UserModel> {
    if (actor.role === UserRole.BRANCH_MANAGER) {
      const allowed = [UserRole.TELLER, UserRole.LOAN_OFFICER];
      if (!allowed.includes(dto.role)) {
        throw new ForbiddenException(
          'Branch managers can only create Teller or Loan Officer accounts.',
        );
      }
      dto = { ...dto, branchId: actor.branchId };
    }

    if (await this.userRepository.existsByEmail(dto.email)) {
      throw new ConflictException(`Email '${dto.email}' is already registered.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = new UserModel({
      id: randomUUID(),
      branchId: dto.branchId ?? null,
      firstName: dto.firstName,
      middleName: dto.middleName ?? null,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
      role: dto.role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.userRepository.save(user);
    return user;
  }

  async findUsers(filters: UserFiltersQuery): Promise<UserModel[]> {
    return this.userRepository.findByFilters({
      branchId: filters.branchId,
      role: filters.role,
      isActive: filters.isActive,
    });
  }

  async findUserById(id: string): Promise<UserModel> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found.`);
    return user;
  }

  async updateUser(id: string, dto: UpdateSettingsUserDto): Promise<UserModel> {
    await this.findUserById(id);
    const fields: Parameters<UserRepository['updateById']>[1] = {};
    if (dto.role !== undefined) fields.role = dto.role;
    if (dto.branchId !== undefined) fields.branch_id = dto.branchId ?? null;
    if (Object.keys(fields).length > 0) {
      await this.userRepository.updateById(id, fields);
    }
    return this.findUserById(id);
  }

  async activateUser(id: string): Promise<UserModel> {
    const user = await this.findUserById(id);
    if (user.isActive) {
      throw new ConflictException('User is already active.');
    }
    user.activate();
    await this.userRepository.save(user);
    return user;
  }

  async deactivateUser(id: string, actorId: string): Promise<UserModel> {
    if (id === actorId) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }
    const user = await this.findUserById(id);
    if (!user.isActive) {
      throw new ConflictException('User is already inactive.');
    }
    user.deactivate();
    await this.userRepository.save(user);
    return user;
  }

  async resetUserPassword(id: string): Promise<{ tempPassword: string }> {
    await this.findUserById(id);
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await this.userRepository.updateById(id, { password_hash: passwordHash });
    return { tempPassword };
  }

  private generateTempPassword(): string {
    const chars =
      'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return Array.from(
      { length: 12 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }
}

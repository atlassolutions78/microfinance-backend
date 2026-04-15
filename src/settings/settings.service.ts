import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BranchRepository } from './branch.repository';
import { BranchEntity } from './branch.entity';
import {
  CreateBranchDto,
  UpdateBranchDto,
  CreateSettingsUserDto,
  UpdateSettingsUserDto,
  UserFiltersQuery,
} from './settings.dto';
import { UserService } from '../users/user.service';
import { UserModel } from '../users/user.model';
import { UserPolicy } from '../users/user.policy';

@Injectable()
export class SettingsService {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly userService: UserService,
  ) {}

  // Branch methods
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

  async activateBranch(id: string, updatedById: string): Promise<BranchEntity> {
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

  // User management methods
  async createSettingsUser(
    dto: CreateSettingsUserDto,
    actor: UserModel,
  ): Promise<UserModel> {
    UserPolicy.assertCanCreateRole(actor.role, dto.role);
    UserPolicy.assertCanAssignBranch(
      actor.role,
      actor.branchId,
      dto.branchId ?? null,
    );

    return this.userService.create({
      ...dto,
      branchId: dto.branchId ?? null,
      middleName: dto.middleName ?? null,
    });
  }

  async listUsers(
    filters: UserFiltersQuery,
  ): Promise<{ data: UserModel[]; total: number }> {
    return this.userService.findAllFiltered(filters);
  }

  async getSettingsUser(id: string): Promise<UserModel> {
    return this.userService.findById(id);
  }

  async updateSettingsUser(
    id: string,
    dto: UpdateSettingsUserDto,
    actor: UserModel,
  ): Promise<UserModel> {
    const target = await this.userService.findById(id);

    if (dto.role !== undefined) {
      UserPolicy.assertCanCreateRole(actor.role, dto.role);
    }

    if (dto.branchId !== undefined) {
      UserPolicy.assertCanAssignBranch(
        actor.role,
        actor.branchId,
        dto.branchId ?? null,
      );
    }

    return this.userService.updateUser(target.id, {
      role: dto.role,
      branchId: dto.branchId,
    });
  }

  async deactivateSettingsUser(
    id: string,
    actor: UserModel,
  ): Promise<UserModel> {
    UserPolicy.assertNotSelf(actor.id, id);
    return this.userService.deactivate(id);
  }

  async activateSettingsUser(id: string): Promise<UserModel> {
    return this.userService.activate(id);
  }

  async resetUserPassword(id: string): Promise<{ tempPassword: string }> {
    return this.userService.resetPassword(id);
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from './user.repository';
import { UserModel } from './user.model';
import { ChangeRoleDto, CreateUserDto, UpdateUserDto, UserFilterDto } from './user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: CreateUserDto): Promise<UserModel> {
    if (await this.userRepository.existsByEmail(dto.email)) {
      throw new ConflictException(
        `Email '${dto.email}' is already registered.`,
      );
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
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.userRepository.save(user);
    return user;
  }

  async findAll(): Promise<UserModel[]> {
    return this.userRepository.findAll();
  }

  async findById(id: string): Promise<UserModel> {
    return this.findOrFail(id);
  }

  async changeRole(id: string, dto: ChangeRoleDto): Promise<UserModel> {
    const user = await this.findOrFail(id);
    user.changeRole(dto.role);
    await this.userRepository.save(user);
    return user;
  }

  async deactivate(id: string): Promise<UserModel> {
    const user = await this.findOrFail(id);
    user.deactivate();
    await this.userRepository.save(user);
    return user;
  }

  async activate(id: string): Promise<UserModel> {
    const user = await this.findOrFail(id);
    user.activate();
    await this.userRepository.save(user);
    return user;
  }

  async findAllFiltered(filters: UserFilterDto): Promise<UserModel[]> {
    return this.userRepository.findAllFiltered(filters);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserModel> {
    const user = await this.findOrFail(id);
    if (dto.role !== undefined) user.changeRole(dto.role);
    if (dto.branchId !== undefined) user.reassignBranch(dto.branchId ?? null);
    await this.userRepository.save(user);
    return user;
  }

  async resetPassword(id: string): Promise<{ tempPassword: string }> {
    const user = await this.findOrFail(id);
    const tempPassword = randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 12);
    user.resetPassword(hash);
    await this.userRepository.save(user);
    return { tempPassword };
  }

  private async findOrFail(id: string): Promise<UserModel> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found.`);
    return user;
  }
}

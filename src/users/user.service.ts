import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from './user.repository';
import { UserModel } from './user.model';
import { CreateUserDto, ChangeRoleDto } from './user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: CreateUserDto): Promise<UserModel> {
    if (await this.userRepository.existsByUsername(dto.username)) {
      throw new ConflictException(`Username '${dto.username}' is already taken.`);
    }
    if (await this.userRepository.existsByEmail(dto.email)) {
      throw new ConflictException(`Email '${dto.email}' is already registered.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = new UserModel({
      id: randomUUID(),
      username: dto.username,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      isActive: true,
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

  private async findOrFail(id: string): Promise<UserModel> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found.`);
    return user;
  }
}

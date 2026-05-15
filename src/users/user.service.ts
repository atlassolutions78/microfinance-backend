import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from './user.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { UserModel } from './user.model';
import {
  ChangeRoleDto,
  CreateUserDto,
  InviteUserDto,
  SetPasswordDto,
  UpdateUserDto,
  UserFilterDto,
} from './user.dto';
import { UserStatus } from './user.enums';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

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
      status: UserStatus.ACTIVE,
      invitationToken: null,
      invitationExpiresAt: null,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.userRepository.save(user);
    return user;
  }

  async inviteUser(dto: InviteUserDto): Promise<UserModel> {
    if (await this.userRepository.existsByEmail(dto.email)) {
      throw new ConflictException(`Email '${dto.email}' is already registered.`);
    }

    const invitationToken = randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7);

    const user = new UserModel({
      id: randomUUID(),
      branchId: dto.branchId,
      firstName: dto.firstName,
      middleName: null,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash: '',
      role: dto.role,
      status: UserStatus.PENDING,
      invitationToken,
      invitationExpiresAt,
      mustChangePassword: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.userRepository.save(user);

    this.notificationsService.sendInvitationEmail({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      token: user.invitationToken!,
      expiresAt: user.invitationExpiresAt!,
    }).catch(err => {
      this.logger.error(`Background email invitation failed for ${user.email}: ${err.message}`);
    });

    return user;
  }

  async activateByToken(dto: SetPasswordDto): Promise<void> {
    const user = await this.userRepository.findByToken(dto.token);
    if (!user) throw new NotFoundException('Invalid or expired invitation token.');

    if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
      throw new ConflictException('Invitation token has expired.');
    }

    const hash = await bcrypt.hash(dto.password, 12);
    user.passwordHash = hash;
    user.status = UserStatus.ACTIVE;
    user.invitationToken = null;
    user.invitationExpiresAt = null;
    user.mustChangePassword = false;
    user.updatedAt = new Date();

    await this.userRepository.save(user);
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

  async findAllFiltered(
    filters: UserFilterDto,
  ): Promise<{ data: UserModel[]; total: number }> {
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

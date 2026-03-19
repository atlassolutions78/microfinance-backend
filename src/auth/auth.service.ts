import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../users/user.repository';
import { SettingsService } from '../settings/settings.service';
import { UserRole } from '../users/user.enums';
import { LoginDto, AuthResponseDto } from './auth.dto';

const GLOBAL_ROLES: UserRole[] = [UserRole.HQ_MANAGER, UserRole.ADMIN];

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly settingsService: SettingsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    const branch = user.branchId
      ? await this.settingsService
          .findBranchById(user.branchId)
          .catch(() => null)
      : null;

    const scope: 'branch' | 'global' = GLOBAL_ROLES.includes(user.role)
      ? 'global'
      : 'branch';

    return {
      accessToken,
      expiresAt,
      user: {
        id: user.id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: branch?.name ?? null,
        branchType: branch?.type ?? null,
        scope,
      },
    };
  }
}

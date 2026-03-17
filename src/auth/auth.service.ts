import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../users/user.repository';
import { LoginDto, AuthResponseDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
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

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }
}

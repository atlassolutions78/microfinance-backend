import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '../users/user.repository';
import { UserModel } from '../users/user.model';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userRepository: UserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'fallback_secret',
    });
  }

  async validate(payload: JwtPayload): Promise<UserModel> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session is no longer valid.');
    }
    return user;
  }
}

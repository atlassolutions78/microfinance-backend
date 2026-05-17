import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.enums';
import { UserService } from './user.service';
import { InviteUserDto } from './user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Invite a new staff member' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  invite(@Body() dto: InviteUserDto) {
    return this.userService.inviteUser(dto);
  }
}

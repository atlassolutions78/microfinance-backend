import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto, ChangeRoleDto } from './user.dto';
import { UserRole } from './user.enums';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new staff account (Admin only)' })
  @Roles(UserRole.ADMIN)
  @ApiBody({
    type: CreateUserDto,
    examples: {
      default: {
        value: {
          branchId: 'db663398-2c38-46b8-b861-6ba8605c0e1d',
          firstName: 'Jean',
          middleName: null,
          lastName: 'Mutombo',
          email: 'jean.mutombo@microfinance.cd',
          password: 'Password123!',
          role: 'TELLER',
        },
      },
    },
  })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all users (Admin / HQ Manager / Branch Manager)',
  })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change the role of a user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN)
  @ApiBody({
    type: ChangeRoleDto,
    examples: {
      default: {
        value: { role: 'LOAN_OFFICER' },
      },
    },
  })
  changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.userService.changeRole(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user account (Admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({
    summary: 'Reactivate a deactivated user account (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN)
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.activate(id);
  }
}

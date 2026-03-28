import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreateBranchDto, UpdateBranchDto } from './settings.dto';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from '../users/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';
import { UserRole } from '../users/user.enums';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ─── Branch Endpoints ─────────────────────────────────────────────────────────

  @Post('branches')
  @ApiOperation({ summary: 'Create a new branch (Admin only)' })
  @Roles(UserRole.ADMIN)
  @ApiBody({
    type: CreateBranchDto,
    examples: {
      default: {
        value: {
          name: 'Agence de Goma',
          code: 'GOM-001',
          type: 'NORMAL',
          address: 'Avenue Président Mobutu 12, Goma, Nord-Kivu',
          phone: '+243812345678',
        },
      },
    },
  })
  createBranch(@Body() dto: CreateBranchDto, @CurrentUser() user: UserModel) {
    return this.settingsService.createBranch(dto, user.id);
  }

  @Get('branches')
  @ApiOperation({ summary: 'List all branches' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  findAllBranches() {
    return this.settingsService.findAllBranches();
  }

  @Get('branches/:id')
  @ApiOperation({ summary: 'Get a single branch by ID' })
  @ApiParam({ name: 'id', description: 'Branch UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  findBranchById(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.findBranchById(id);
  }

  @Patch('branches/:id')
  @ApiOperation({ summary: 'Update branch details' })
  @ApiParam({ name: 'id', description: 'Branch UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  @ApiBody({
    type: UpdateBranchDto,
    examples: {
      default: {
        value: {
          name: 'Agence de Goma Nord',
          address: 'Avenue Président Mobutu 12, Goma, Nord-Kivu',
          phone: '+243898765432',
        },
      },
    },
  })
  updateBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.settingsService.updateBranch(id, dto, user.id);
  }

  @Patch('branches/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a branch (Admin only)' })
  @ApiParam({ name: 'id', description: 'Branch UUID' })
  @Roles(UserRole.ADMIN)
  deactivateBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.settingsService.deactivateBranch(id, user.id);
  }

  @Patch('branches/:id/activate')
  @Roles(UserRole.ADMIN)
  activateBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.settingsService.activateBranch(id, user.id);
  }

  // ─── User Management Endpoints ────────────────────────────────────────────────

  @Post('users')
  @Roles(UserRole.ADMIN, UserRole.BRANCH_MANAGER)
  createUser(@Body() dto: CreateUserDto, @CurrentUser() actor: UserModel) {
    return this.settingsService.createSettingsUser(dto, actor);
  }

  @Get('users')
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  listUsers(@Query() filters: UserFilterDto) {
    return this.settingsService.listUsers(filters);
  }

  @Get('users/:id')
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.getSettingsUser(id);
  }

  @Patch('users/:id')
  @Roles(UserRole.ADMIN, UserRole.BRANCH_MANAGER)
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: UserModel,
  ) {
    return this.settingsService.updateSettingsUser(id, dto, actor);
  }

  @Patch('users/:id/activate')
  @Roles(UserRole.ADMIN)
  activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.activateSettingsUser(id);
  }

  @Patch('users/:id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: UserModel,
  ) {
    return this.settingsService.deactivateSettingsUser(id, actor);
  }

  @Post('users/:id/reset-password')
  @Roles(UserRole.ADMIN)
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.resetUserPassword(id);
  }
}

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
  ApiQuery,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import {
  CreateBranchDto,
  UpdateBranchDto,
  CreateSettingsUserDto,
  UpdateSettingsUserDto,
  UserFiltersQuery,
} from './settings.dto';
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

  // ─── Branches ───────────────────────────────────────────────────────────────

  @Post('branches')
  @ApiOperation({ summary: 'Create a new branch (Admin only)' })
  @Roles(UserRole.ADMIN)
  @ApiBody({ type: CreateBranchDto })
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
  @ApiBody({ type: UpdateBranchDto })
  updateBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.settingsService.updateBranch(id, dto, user.id);
  }

  @Patch('branches/:id/activate')
  @ApiOperation({ summary: 'Activate a branch (Admin only)' })
  @ApiParam({ name: 'id', description: 'Branch UUID' })
  @Roles(UserRole.ADMIN)
  activateBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.settingsService.activateBranch(id, user.id);
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

  // ─── Users ──────────────────────────────────────────────────────────────────

  @Post('users')
  @ApiOperation({ summary: 'Create a staff user (Admin / Branch Manager)' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  @ApiBody({ type: CreateSettingsUserDto })
  createUser(
    @Body() dto: CreateSettingsUserDto,
    @CurrentUser() actor: UserModel,
  ) {
    return this.settingsService.createUser(dto, actor);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users — filterable by branch, role, status' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findUsers(@Query() filters: UserFiltersQuery) {
    return this.settingsService.findUsers(filters);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  findUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.findUserById(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user role and/or branch assignment' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  @ApiBody({ type: UpdateSettingsUserDto })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSettingsUserDto,
  ) {
    return this.settingsService.updateUser(id, dto);
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.activateUser(id);
  }

  @Patch('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: UserModel,
  ) {
    return this.settingsService.deactivateUser(id, actor.id);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset a user password — returns a temp password' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  resetUserPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.resetUserPassword(id);
  }
}

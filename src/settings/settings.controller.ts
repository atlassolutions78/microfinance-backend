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

  // Branch endpoints
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

  // User management endpoints
  @Post('users')
  @ApiOperation({ summary: 'Create a staff user' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  @ApiBody({ type: CreateSettingsUserDto })
  createUser(
    @Body() dto: CreateSettingsUserDto,
    @CurrentUser() actor: UserModel,
  ) {
    return this.settingsService.createSettingsUser(dto, actor);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users filtered by branch, role, or status' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  listUsers(@Query() filters: UserFiltersQuery) {
    return this.settingsService.listUsers(filters);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.getSettingsUser(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user role and/or branch assignment' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  @ApiBody({ type: UpdateSettingsUserDto })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSettingsUserDto,
    @CurrentUser() actor: UserModel,
  ) {
    return this.settingsService.updateSettingsUser(id, dto, actor);
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.activateSettingsUser(id);
  }

  @Patch('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: UserModel,
  ) {
    return this.settingsService.deactivateSettingsUser(id, actor);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset a user password and return a temporary password' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.resetUserPassword(id);
  }
}

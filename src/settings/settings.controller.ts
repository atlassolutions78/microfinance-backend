import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreateBranchDto, UpdateBranchDto } from './settings.dto';
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

  @Post('branches')
  @Roles(UserRole.ADMIN)
  createBranch(@Body() dto: CreateBranchDto, @CurrentUser() user: UserModel) {
    return this.settingsService.createBranch(dto, user.id);
  }

  @Get('branches')
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  findAllBranches() {
    return this.settingsService.findAllBranches();
  }

  @Get('branches/:id')
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER)
  findBranchById(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.findBranchById(id);
  }

  @Patch('branches/:id')
  @Roles(UserRole.ADMIN, UserRole.HQ_MANAGER)
  updateBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.settingsService.updateBranch(id, dto, user.id);
  }

  @Patch('branches/:id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivateBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.settingsService.deactivateBranch(id, user.id);
  }
}

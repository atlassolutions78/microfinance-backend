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
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
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
}

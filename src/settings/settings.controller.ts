import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateBranchDto, UpdateBranchDto } from './settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('branches')
  createBranch(@Body() dto: CreateBranchDto) {
    return this.settingsService.createBranch(dto);
  }

  @Get('branches')
  findAllBranches() {
    return this.settingsService.findAllBranches();
  }

  @Get('branches/:id')
  findBranchById(@Param('id', ParseUUIDPipe) id: string) {
    return this.settingsService.findBranchById(id);
  }

  @Patch('branches/:id')
  updateBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.settingsService.updateBranch(id, dto);
  }
}

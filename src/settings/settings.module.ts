import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from './branch.entity';
import { BranchRepository } from './branch.repository';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity])],
  controllers: [SettingsController],
  providers: [SettingsService, BranchRepository],
  exports: [SettingsService],
})
export class SettingsModule {}

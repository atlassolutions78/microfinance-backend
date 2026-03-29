import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from './branch.entity';
import { BranchRepository } from './branch.repository';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { UserEntity } from '../users/user.entity';
import { UserRepository } from '../users/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity, UserEntity])],
  controllers: [SettingsController],
  providers: [SettingsService, BranchRepository, UserRepository],
  exports: [SettingsService],
})
export class SettingsModule {}

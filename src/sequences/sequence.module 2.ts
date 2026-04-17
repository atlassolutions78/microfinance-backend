import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../settings/branch.entity';
import { ClientSequenceEntity, ReferenceSequenceEntity } from './sequence.entity';
import { SequenceService } from './sequence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferenceSequenceEntity,
      ClientSequenceEntity,
      BranchEntity,
    ]),
  ],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class SequenceModule {}

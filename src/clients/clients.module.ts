import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ClientEntity,
  IndividualProfileEntity,
  BusinessProfileEntity,
  MinorGuardianEntity,
  RepresentativeEntity,
} from './client.entity';
import { ClientRepository } from './client.repository';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientEntity,
      IndividualProfileEntity,
      BusinessProfileEntity,
      MinorGuardianEntity,
      RepresentativeEntity,
    ]),
  ],
  controllers: [ClientController],
  providers: [ClientService, ClientRepository],
  exports: [ClientService],
})
export class ClientsModule {}

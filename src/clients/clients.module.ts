import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsModule } from '../documents/documents.module';
import {
  ClientEntity,
  IndividualProfileEntity,
  OrganizationProfileEntity,
  MinorGuardianEntity,
  RepresentativeEntity,
  OrganizationRepresentativeEntity,
} from './client.entity';
import { ClientRepository } from './client.repository';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';

@Module({
  imports: [
    DocumentsModule,
    TypeOrmModule.forFeature([
      ClientEntity,
      IndividualProfileEntity,
      OrganizationProfileEntity,
      MinorGuardianEntity,
      RepresentativeEntity,
      OrganizationRepresentativeEntity,
    ]),
  ],
  controllers: [ClientController],
  providers: [ClientService, ClientRepository],
  exports: [ClientService],
})
export class ClientsModule {}

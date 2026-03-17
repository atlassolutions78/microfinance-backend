import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ClientDocumentEntity,
  RepresentativeDocumentEntity,
  GuardianDocumentEntity,
} from './document.entity';
import { DocumentRepository } from './document.repository';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientDocumentEntity,
      RepresentativeDocumentEntity,
      GuardianDocumentEntity,
    ]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentRepository],
  exports: [DocumentService],
})
export class DocumentsModule {}

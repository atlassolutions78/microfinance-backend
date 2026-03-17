import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientDocumentEntity,
  RepresentativeDocumentEntity,
  GuardianDocumentEntity,
} from './document.entity';
import { DocumentModel, DocumentOwnerType } from './document.model';
import { DocumentMapper } from './document.mapper';

@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(ClientDocumentEntity)
    private readonly clientRepo: Repository<ClientDocumentEntity>,

    @InjectRepository(RepresentativeDocumentEntity)
    private readonly representativeRepo: Repository<RepresentativeDocumentEntity>,

    @InjectRepository(GuardianDocumentEntity)
    private readonly guardianRepo: Repository<GuardianDocumentEntity>,
  ) {}

  async save(doc: DocumentModel): Promise<void> {
    if (doc.ownerType === 'CLIENT') {
      await this.clientRepo.save(DocumentMapper.toClientEntity(doc));
    } else if (doc.ownerType === 'REPRESENTATIVE') {
      await this.representativeRepo.save(DocumentMapper.toRepresentativeEntity(doc));
    } else {
      await this.guardianRepo.save(DocumentMapper.toGuardianEntity(doc));
    }
  }

  async findById(id: string, ownerType: DocumentOwnerType): Promise<DocumentModel | null> {
    if (ownerType === 'CLIENT') {
      const entity = await this.clientRepo.findOne({ where: { id } });
      return entity ? DocumentMapper.fromClientEntity(entity) : null;
    } else if (ownerType === 'REPRESENTATIVE') {
      const entity = await this.representativeRepo.findOne({ where: { id } });
      return entity ? DocumentMapper.fromRepresentativeEntity(entity) : null;
    } else {
      const entity = await this.guardianRepo.findOne({ where: { id } });
      return entity ? DocumentMapper.fromGuardianEntity(entity) : null;
    }
  }

  async findByClient(clientId: string): Promise<DocumentModel[]> {
    const entities = await this.clientRepo.find({
      where: { client_id: clientId },
      order: { uploaded_at: 'DESC' },
    });
    return entities.map(DocumentMapper.fromClientEntity);
  }

  async findByRepresentative(representativeId: string): Promise<DocumentModel[]> {
    const entities = await this.representativeRepo.find({
      where: { representative_id: representativeId },
      order: { uploaded_at: 'DESC' },
    });
    return entities.map(DocumentMapper.fromRepresentativeEntity);
  }

  async findByGuardian(guardianId: string): Promise<DocumentModel[]> {
    const entities = await this.guardianRepo.find({
      where: { guardian_id: guardianId },
      order: { uploaded_at: 'DESC' },
    });
    return entities.map(DocumentMapper.fromGuardianEntity);
  }
}

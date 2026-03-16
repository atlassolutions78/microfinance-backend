import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './document.entity';
import { DocumentModel } from './document.model';
import { DocumentMapper } from './document.mapper';
import { DocumentOwnerType } from './document.enums';

@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly repo: Repository<DocumentEntity>,
  ) {}

  async save(doc: DocumentModel): Promise<void> {
    await this.repo.save(DocumentMapper.toEntity(doc));
  }

  async findById(id: string): Promise<DocumentModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? DocumentMapper.toDomain(entity) : null;
  }

  async findByOwner(
    ownerType: DocumentOwnerType,
    ownerId: string,
  ): Promise<DocumentModel[]> {
    const entities = await this.repo.find({
      where: { owner_type: ownerType, owner_id: ownerId },
      order: { uploaded_at: 'DESC' },
    });
    return entities.map(DocumentMapper.toDomain);
  }
}

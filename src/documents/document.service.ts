import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { DocumentRepository } from './document.repository';
import { DocumentModel } from './document.model';
import { DocumentOwnerType } from './document.enums';
import { UploadDocumentDto } from './document.dto';

// Allowed MIME types for uploaded documents
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

@Injectable()
export class DocumentService {
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes: number;

  constructor(private readonly documentRepository: DocumentRepository) {
    this.uploadDir = process.env.UPLOAD_DIR ?? './uploads';
    const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10);
    this.maxFileSizeBytes = maxMb * 1024 * 1024;
  }

  async upload(
    dto: UploadDocumentDto,
    file: Express.Multer.File,
    uploadedBy: string,
  ): Promise<DocumentModel> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type '${file.mimetype}'. Allowed: JPEG, PNG, WebP, PDF.`,
      );
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File exceeds the maximum allowed size of ${process.env.MAX_FILE_SIZE_MB ?? 10} MB.`,
      );
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const fileName = `${randomUUID()}${ext}`;
    const ownerDir = path.join(this.uploadDir, dto.ownerType.toLowerCase(), dto.ownerId);
    const filePath = path.join(ownerDir, fileName);
    const relPath = path.relative(this.uploadDir, filePath).replace(/\\/g, '/');

    // Ensure the directory exists
    fs.mkdirSync(ownerDir, { recursive: true });
    fs.writeFileSync(filePath, file.buffer);

    const document = new DocumentModel({
      id: randomUUID(),
      documentType: dto.documentType,
      filePath: relPath,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      uploadedBy,
      uploadedAt: new Date(),
      isVerified: false,
    });

    await this.documentRepository.save(document);
    return document;
  }

  async verify(documentId: string, officerId: string): Promise<DocumentModel> {
    const doc = await this.findOrFail(documentId);
    doc.verify(officerId);
    await this.documentRepository.save(doc);
    return doc;
  }

  async findByOwner(
    ownerType: DocumentOwnerType,
    ownerId: string,
  ): Promise<DocumentModel[]> {
    return this.documentRepository.findByOwner(ownerType, ownerId);
  }

  async findById(id: string): Promise<DocumentModel> {
    return this.findOrFail(id);
  }

  private async findOrFail(id: string): Promise<DocumentModel> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) throw new NotFoundException(`Document ${id} not found.`);
    return doc;
  }
}

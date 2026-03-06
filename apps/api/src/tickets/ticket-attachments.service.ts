import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import type { PresignUploadAttachmentDto } from './dto/presign-upload-attachment.dto';
import type { PresignUploadAttachmentResponseDto } from './tickets.types';

const DEFAULT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

@Injectable()
export class TicketAttachmentsService {
  constructor(private readonly storageService: StorageService) {}

  validateInput(dto: PresignUploadAttachmentDto) {
    if (!dto.filename || dto.filename.trim().length === 0) {
      throw new BadRequestException('filename is required');
    }
    if (!dto.mime || dto.mime.trim().length === 0) {
      throw new BadRequestException('mime is required');
    }
    if (!this.isAllowedMime(dto.mime)) {
      throw new BadRequestException('mime must be application/pdf or image/*');
    }
    if (!Number.isFinite(dto.sizeBytes) || dto.sizeBytes <= 0) {
      throw new BadRequestException('sizeBytes must be a positive number');
    }
    const maxBytes = this.getMaxAttachmentBytes();
    if (dto.sizeBytes > maxBytes) {
      throw new BadRequestException(`sizeBytes exceeds max allowed (${maxBytes})`);
    }
    // TODO: add content sniffing beyond mime value in later iteration.
  }

  createObjectKey(customerId: string, ticketId: string, attachmentId: string, filename: string) {
    const safeFilename = this.sanitizeFilename(filename);
    return {
      safeFilename,
      objectKey: this.storageService.createObjectKey(customerId, ticketId, attachmentId, safeFilename)
    };
  }

  async buildPresignedUploadResponse(
    objectKey: string,
    mime: string,
    attachmentId: string
  ): Promise<PresignUploadAttachmentResponseDto> {
    const uploadUrl = await this.storageService.getPresignedUploadUrl(objectKey, mime);

    return {
      attachmentId,
      objectKey,
      uploadUrl,
      requiredHeaders: {
        'Content-Type': mime
      }
    };
  }

  async getDownloadUrl(objectKey: string): Promise<string> {
    return this.storageService.getPresignedDownloadUrl(objectKey);
  }

  private isAllowedMime(mime: string) {
    return mime === 'application/pdf' || mime.startsWith('image/');
  }

  private getMaxAttachmentBytes() {
    const raw = Number(process.env.MAX_ATTACHMENT_BYTES ?? DEFAULT_MAX_ATTACHMENT_BYTES);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_ATTACHMENT_BYTES;
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[^\w.\-]/g, '_').replace(/^_+/, '').slice(0, 255) || 'attachment';
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient, AuditAction } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImageInspectorService } from './image-inspector.service';
import { ImageInspectionResult } from '../models/gif.model';

@Injectable()
export class GifAssetService implements OnModuleInit {
  private readonly logger = new Logger(GifAssetService.name);
  private readonly prisma = new PrismaClient();
  private readonly storageDirectory = path.resolve(process.cwd(), 'storage', 'uploads', 'gif-assets');

  constructor(private readonly inspector: ImageInspectorService) {}

  onModuleInit() {
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory() {
    try {
      if (!fs.existsSync(this.storageDirectory)) {
        fs.mkdirSync(this.storageDirectory, { recursive: true });
        this.logger.log(`Created asset storage directory: ${this.storageDirectory}`);
      }
    } catch (err) {
      this.logger.error(`Failed to initialize asset storage directory: ${err.message}`, err.stack);
    }
  }

  /**
   * Processes, validates, hashes, and stores an uploaded image asset.
   */
  async processAndStoreUpload(
    userId: string,
    fileBuffer: Buffer,
    originalFilename: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User identification is required for asset storage');
    }

    // 1. Deep Binary Inspection & Validation
    const inspection: ImageInspectionResult = this.inspector.inspectBuffer(
      fileBuffer,
      originalFilename,
    );
    const sanitizedFilename = this.inspector.sanitizeFilename(originalFilename);

    // 2. Asset Deduplication (per-user)
    const existingAsset = await this.prisma.gifAsset.findFirst({
      where: {
        userId,
        fileHash: inspection.fileHash,
      },
    });

    if (existingAsset) {
      this.logger.log(
        `Asset deduplicated: existing asset ${existingAsset.id} returned for hash ${inspection.fileHash}`,
      );
      return existingAsset;
    }

    // 3. Persist file to storage directory using random UUID key
    const extension = this.getExtensionForFormat(inspection.format);
    const storageKey = `${uuidv4()}${extension}`;
    const targetFilePath = path.join(this.storageDirectory, storageKey);

    // Verify no path traversal escaping storage directory
    const resolvedPath = path.resolve(targetFilePath);
    if (!resolvedPath.startsWith(this.storageDirectory)) {
      throw new BadRequestException('Path traversal attempt detected in asset storage key');
    }

    await fs.promises.writeFile(targetFilePath, fileBuffer);

    // 4. Save to Database
    const asset = await this.prisma.gifAsset.create({
      data: {
        userId,
        originalFilename,
        sanitizedFilename,
        storageKey,
        mimeType: inspection.mimeType,
        format: inspection.format,
        fileSizeBytes: inspection.fileSizeBytes,
        fileHash: inspection.fileHash,
        width: inspection.width,
        height: inspection.height,
        hasAlpha: inspection.hasAlpha,
        metadata: {
          colorDepth: inspection.colorDepth || 24,
          aspectRatio: (inspection.width / inspection.height).toFixed(4),
          storageStrategy: 'LOCAL_DISK',
        },
      },
    });

    // 5. Audit Logging
    try {
      await this.prisma.auditLog.create({
        data: {
          actor: userId,
          action: 'GIF_IMAGE_UPLOADED' as AuditAction,
          resource: 'GIF_ASSET',
          resourceId: asset.id,
          result: 'SUCCESS',
        },
      });
    } catch (auditErr) {
      this.logger.warn(`Failed to write audit log for asset ${asset.id}: ${auditErr.message}`);
    }

    this.logger.log(
      `Asset created successfully: ${asset.id} (${inspection.format}, ${inspection.width}x${inspection.height}, ${inspection.fileSizeBytes} bytes)`,
    );

    return asset;
  }

  /**
   * Retrieves asset metadata by ID with IDOR tenant verification.
   */
  async getAssetById(assetId: string, userId: string) {
    const asset = await this.prisma.gifAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`GIF Asset [${assetId}] not found`);
    }

    if (asset.userId !== userId) {
      throw new ForbiddenException(`You do not have permission to access this asset`);
    }

    return asset;
  }

  /**
   * Retrieves asset file buffer for streaming with security and boundary checks.
   */
  async getAssetFile(assetId: string, userId: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const asset = await this.getAssetById(assetId, userId);
    const filePath = path.join(this.storageDirectory, asset.storageKey);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Asset physical file not found on disk`);
    }

    const buffer = await fs.promises.readFile(filePath);
    return {
      buffer,
      mimeType: asset.mimeType,
      filename: asset.sanitizedFilename,
    };
  }

  /**
   * Deletes an asset and removes stored file if not referenced.
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const asset = await this.getAssetById(assetId, userId);

    const referencingProjects = await this.prisma.gifProject.count({
      where: { originalAssetId: assetId },
    });

    if (referencingProjects > 0) {
      throw new BadRequestException(
        `Cannot delete asset: it is referenced by ${referencingProjects} active project(s)`,
      );
    }

    await this.prisma.gifAsset.delete({
      where: { id: assetId },
    });

    const filePath = path.join(this.storageDirectory, asset.storageKey);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        this.logger.warn(`Failed to remove asset file ${filePath}: ${err.message}`);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actor: userId,
        action: 'GIF_PROJECT_DELETED' as AuditAction,
        resource: 'GIF_ASSET',
        resourceId: assetId,
        result: 'SUCCESS',
      },
    });
  }

  private getExtensionForFormat(format: string): string {
    switch (format) {
      case 'PNG':
        return '.png';
      case 'JPEG':
        return '.jpg';
      case 'GIF':
        return '.gif';
      case 'WEBP':
        return '.webp';
      default:
        return '.bin';
    }
  }
}

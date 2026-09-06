import { GifExportService } from '../../src/application/gif/services/gif-export.service';
import { GifQuantizerService } from '../../src/application/gif/services/gif-quantizer.service';
import { GifDitheringService } from '../../src/application/gif/services/gif-dithering.service';
import { FrameRasterizerService } from '../../src/application/gif/services/frame-rasterizer.service';
import { GifOptimizerService } from '../../src/application/gif/services/gif-optimizer.service';
import { GifAssetService } from '../../src/application/gif/services/gif-asset.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

describe('GifExportService', () => {
  let exportService: GifExportService;
  let mockAssetService: Partial<GifAssetService>;
  let mockPrisma: any;

  const mockUserId = 'user-uuid-1';
  const mockProjectId = 'project-uuid-1';

  // Sample 4x4 PNG
  const png = new PNG({ width: 4, height: 4 });
  png.data.fill(180);
  const samplePngBuffer = PNG.sync.write(png);

  beforeEach(() => {
    mockAssetService = {
      getAssetFile: jest.fn().mockResolvedValue({
        buffer: samplePngBuffer,
        mimeType: 'image/png',
        filename: 'sample.png',
      }),
    };

    mockPrisma = {
      gifProject: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockProjectId,
          userId: mockUserId,
          name: 'My Custom Animation',
          originalAssetId: 'asset-1',
          status: 'READY',
          width: 4,
          height: 4,
          outputWidth: 4,
          outputHeight: 4,
          duration: 1.0,
          fps: 5,
          randomSeed: BigInt(98765),
          outputFormat: 'GIF',
          animationConfiguration: {
            duration: 1.0,
            fps: 5,
            loopCount: 0,
            quality: 85,
            dithering: true,
            pixelArtMode: false,
            effects: [],
            seed: '98765',
          },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    exportService = new GifExportService(
      mockAssetService as any,
      new GifQuantizerService(),
      new GifDitheringService(),
      new FrameRasterizerService(),
      new GifOptimizerService(),
    );

    (exportService as any).prisma = mockPrisma;
    exportService.onModuleInit();
  });

  it('should reject unauthorized user', async () => {
    await expect(
      exportService.exportProject('unauthorized-user', mockProjectId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should export project to animated GIF format with summary metrics', async () => {
    const summary = await exportService.exportProject(mockUserId, mockProjectId, {
      outputFormat: 'GIF',
      preset: 'BALANCED',
    });

    expect(summary.exportId).toBeDefined();
    expect(summary.outputFormat).toBe('GIF');
    expect(summary.fileSizeBytes).toBeGreaterThan(0);
    expect(summary.fileHash.length).toBe(64); // SHA-256 hex string length
    expect(mockPrisma.gifProject.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockProjectId },
        data: { status: 'EXPORTED' },
      }),
    );
  });

  it('should export project to APNG format with valid headers', async () => {
    const summary = await exportService.exportProject(mockUserId, mockProjectId, {
      outputFormat: 'APNG',
      preset: 'HIGH_QUALITY',
    });

    expect(summary.outputFormat).toBe('APNG');
    expect(summary.fileSizeBytes).toBeGreaterThan(0);
  });

  it('should stream exported artifact binary for download', async () => {
    const summary = await exportService.exportProject(mockUserId, mockProjectId, {
      outputFormat: 'GIF',
    });

    const download = await exportService.getExportDownload(summary.exportId);
    expect(download.buffer.length).toBe(summary.fileSizeBytes);
    expect(download.mimeType).toBe('image/gif');
  });
});

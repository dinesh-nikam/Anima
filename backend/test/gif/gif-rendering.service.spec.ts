import { GifRenderingService } from '../../src/application/gif/services/gif-rendering.service';
import { GifQuantizerService } from '../../src/application/gif/services/gif-quantizer.service';
import { GifDitheringService } from '../../src/application/gif/services/gif-dithering.service';
import { FrameRasterizerService } from '../../src/application/gif/services/frame-rasterizer.service';
import { GifAssetService } from '../../src/application/gif/services/gif-asset.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

describe('GifRenderingService', () => {
  let service: GifRenderingService;
  let quantizer: GifQuantizerService;
  let dithering: GifDitheringService;
  let rasterizer: FrameRasterizerService;
  let mockAssetService: Partial<GifAssetService>;
  let mockPrisma: any;

  const mockUserId = 'user-uuid-1';
  const mockProjectId = 'project-uuid-1';
  const mockAssetId = 'asset-uuid-1';

  // Create a minimal 8x8 synthetic PNG buffer
  const png = new PNG({ width: 8, height: 8 });
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const idx = (y * 8 + x) * 4;
      png.data[idx] = (x * 30) % 255;
      png.data[idx + 1] = (y * 30) % 255;
      png.data[idx + 2] = 120;
      png.data[idx + 3] = 255;
    }
  }
  const samplePngBuffer = PNG.sync.write(png);

  beforeEach(() => {
    quantizer = new GifQuantizerService();
    dithering = new GifDitheringService();
    rasterizer = new FrameRasterizerService();

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
          name: 'Test Project',
          originalAssetId: mockAssetId,
          status: 'READY',
          width: 8,
          height: 8,
          outputWidth: 8,
          outputHeight: 8,
          duration: 1.0,
          fps: 10,
          randomSeed: BigInt(123456),
          animationConfiguration: {
            duration: 1.0,
            fps: 10,
            loopCount: 0,
            quality: 85,
            dithering: true,
            pixelArtMode: false,
            effects: [
              {
                id: 'zoom',
                name: 'Zoom',
                category: 'CAMERA',
                enabled: true,
                intensity: 0.5,
                speed: 1.0,
              },
            ],
            seed: '123456',
          },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      gifRenderJob: {
        create: jest.fn().mockImplementation((args) => ({
          id: 'job-uuid-1',
          ...args.data,
          createdAt: new Date(),
        })),
        findUnique: jest.fn().mockResolvedValue({
          id: 'job-uuid-1',
          projectId: mockProjectId,
          userId: mockUserId,
          status: 'RENDERING',
        }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'job-uuid-1',
          projectId: mockProjectId,
          userId: mockUserId,
          status: 'RENDERED',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    service = new GifRenderingService(
      mockAssetService as any,
      quantizer,
      dithering,
      rasterizer,
    );

    (service as any).prisma = mockPrisma;
    service.onModuleInit();
  });

  it('should reject unauthorized user when starting render job', async () => {
    await expect(
      service.startRenderJob('other-user-uuid', mockProjectId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject when project does not exist', async () => {
    mockPrisma.gifProject.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.startRenderJob(mockUserId, 'non-existent-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should successfully launch background render job', async () => {
    const result = await service.startRenderJob(mockUserId, mockProjectId, {
      duration: 1.0,
      fps: 10,
    });

    expect(result.jobId).toBe('job-uuid-1');
    expect(result.status).toBe('RENDERING');
    expect(result.totalFrames).toBe(10);
    expect(mockPrisma.gifProject.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockProjectId },
        data: { status: 'RENDERING' },
      }),
    );
  });

  it('should retrieve latest render job for project', async () => {
    const job = await service.getLatestJobForProject(mockUserId, mockProjectId);
    expect(job).toBeDefined();
    expect(job?.status).toBe('RENDERED');
  });

  it('should cancel an in-flight render job', async () => {
    const cancelRes = await service.cancelRenderJob(mockUserId, 'job-uuid-1');
    expect(cancelRes.message).toContain('cancellation requested');
  });

  it('should stream rendered GIF binary when completed', async () => {
    // Create temporary mock file
    const tempDir = path.resolve(process.cwd(), 'storage', 'uploads', 'gif-renders');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFile = path.join(tempDir, 'job-uuid-done.gif');
    const mockGifData = Buffer.from('GIF89a\x08\x00\x08\x00');
    fs.writeFileSync(tempFile, mockGifData);

    mockPrisma.gifRenderJob.findUnique.mockResolvedValueOnce({
      id: 'job-uuid-done',
      projectId: mockProjectId,
      userId: mockUserId,
      status: 'RENDERED',
      outputAssetPath: tempFile,
    });

    const download = await service.getRenderDownload(mockUserId, 'job-uuid-done');
    expect(download.buffer.length).toBeGreaterThan(0);
    expect(download.filename).toContain('.gif');

    // Clean up
    try {
      fs.unlinkSync(tempFile);
    } catch (_) {}
  });
});

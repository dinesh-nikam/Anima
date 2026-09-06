import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { GifProjectService } from '../../src/application/gif/services/gif-project.service';
import { GifAssetService } from '../../src/application/gif/services/gif-asset.service';

describe('GifProjectService — Phase 1 Project Lifecycle & State Machine', () => {
  let projectService: GifProjectService;
  let mockAssetService: any;
  let mockAnalyzerService: any;
  let mockPrisma: any;

  const mockUser1 = 'user-uuid-1111';
  const mockUser2 = 'user-uuid-2222';

  const mockAsset = {
    id: 'asset-uuid-1',
    userId: mockUser1,
    originalFilename: 'hero_character.png',
    sanitizedFilename: 'hero_character.png',
    storageKey: 'asset-uuid-1.png',
    mimeType: 'image/png',
    format: 'PNG',
    fileSizeBytes: 20480,
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    width: 800,
    height: 600,
    hasAlpha: true,
  };

  const mockAnalysisResult = {
    width: 800,
    height: 600,
    aspectRatio: 1.333,
    hasAlpha: true,
    alphaCoverage: 0.1,
    brightness: 0.25,
    contrast: 0.5,
    edgeDensity: 0.3,
    complexity: 0.4,
    darkScene: { detected: true, confidence: 0.85 },
    pixelArt: { detected: true, confidence: 0.88 },
    photographic: { detected: false, confidence: 0.2 },
    flatAreaRatio: 0.4,
    dominantColors: [{ hex: '#112233', rgb: [17, 34, 51], percentage: 0.6 }],
    uniqueColorCount: 24,
    semanticObjects: { status: 'NOT_SUPPORTED', confidence: 0.0, detected: false },
    characters: { status: 'NOT_SUPPORTED', confidence: 0.0, detected: false },
    analyzerVersion: '1.0.0',
    analysisDurationMs: 12,
  };

  const mockProject = {
    id: 'proj-uuid-1',
    userId: mockUser1,
    name: 'hero_character',
    originalAssetId: mockAsset.id,
    originalImageHash: mockAsset.fileHash,
    width: 800,
    height: 600,
    format: 'PNG',
    animationConfiguration: {
      duration: 3.0,
      fps: 15,
      loopCount: 0,
      quality: 85,
      dithering: true,
      pixelArtMode: false,
      effects: [],
      seed: '123456',
    },
    randomSeed: BigInt(123456),
    rendererVersion: '1.0.0',
    effectEngineVersion: '1.0.0',
    duration: 3.0,
    fps: 15,
    outputFormat: 'GIF',
    outputWidth: 800,
    outputHeight: 600,
    status: 'DRAFT',
    statusReason: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    asset: mockAsset,
  };

  beforeEach(() => {
    mockAssetService = {
      getAssetById: jest.fn().mockImplementation((assetId, userId) => {
        if (assetId === mockAsset.id && userId === mockUser1) {
          return Promise.resolve(mockAsset);
        }
        if (userId !== mockUser1) {
          throw new ForbiddenException('Access denied to asset');
        }
        throw new NotFoundException('Asset not found');
      }),
      getAssetFile: jest.fn().mockResolvedValue({
        buffer: Buffer.from('synthetic-buffer'),
        mimeType: 'image/png',
        filename: 'hero_character.png',
      }),
    };

    mockAnalyzerService = {
      analyze: jest.fn().mockResolvedValue(mockAnalysisResult),
    };

    mockPrisma = {
      gifProject: {
        create: jest.fn().mockResolvedValue(mockProject),
        findUnique: jest.fn().mockResolvedValue(mockProject),
        update: jest.fn().mockImplementation((args) => {
          return Promise.resolve({
            ...mockProject,
            ...args.data,
            asset: mockAsset,
          });
        }),
        findMany: jest.fn().mockResolvedValue([mockProject]),
        count: jest.fn().mockResolvedValue(1),
        delete: jest.fn().mockResolvedValue(mockProject),
      },
      gifProjectVersion: {
        create: jest.fn().mockResolvedValue({ id: 'ver-uuid-1', versionNumber: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'ver-uuid-1', versionNumber: 1 }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'ver-uuid-1', versionNumber: 1, randomSeed: BigInt(123456) },
        ]),
      },
      gifAnalysisResult: {
        upsert: jest.fn().mockResolvedValue({ id: 'analysis-uuid-1', ...mockAnalysisResult }),
        findUnique: jest.fn().mockResolvedValue({ id: 'analysis-uuid-1', ...mockAnalysisResult }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-uuid-1' }),
      },
    };

    const mockRandomizeResult = {
      configuration: {
        duration: 3.0,
        fps: 15,
        loopCount: 0,
        quality: 85,
        dithering: true,
        pixelArtMode: false,
        effects: [
          {
            id: 'camera_zoom',
            name: 'Camera Zoom',
            category: 'CAMERA',
            enabled: true,
            locked: false,
            intensity: 0.2,
          },
        ],
        seed: '987654',
      },
      seed: '987654',
      profile: 'BALANCED',
      selectedEffectCount: 1,
      preservedLockedCount: 0,
      appliedBiases: [],
    };

    const mockRandomizationEngine = {
      generateRandomConfiguration: jest.fn().mockReturnValue(mockRandomizeResult),
    };

    projectService = new GifProjectService(
      mockAssetService as unknown as GifAssetService,
      mockAnalyzerService as unknown as any,
      mockRandomizationEngine as unknown as any,
    );
    (projectService as any).prisma = mockPrisma;
  });

  describe('Project Creation', () => {
    it('should create a project with initial DRAFT status and version 1 snapshot', async () => {
      const result = await projectService.createProject(mockUser1, {
        assetId: mockAsset.id,
        name: 'My Custom Project',
        duration: 4.0,
        fps: 20,
        seed: 888999,
      });

      expect(mockAssetService.getAssetById).toHaveBeenCalledWith(mockAsset.id, mockUser1);
      expect(mockPrisma.gifProject.create).toHaveBeenCalled();
      expect(mockPrisma.gifProjectVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 1,
            duration: 4.0,
            fps: 20,
          }),
        }),
      );
      expect(result.id).toBe(mockProject.id);
      expect(result.randomSeed).toBe('123456');
    });

    it('should prevent creating a project with an asset owned by another user', async () => {
      await expect(
        projectService.createProject(mockUser2, { assetId: mockAsset.id }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Explicit State Machine Transitions (Section 21)', () => {
    it('should allow valid transition from DRAFT to ANALYZING', async () => {
      const updated = await projectService.transitionStatus(mockUser1, mockProject.id, 'ANALYZING');
      expect(updated.status).toBe('ANALYZING');
    });

    it('should allow valid transition from DRAFT to READY', async () => {
      const updated = await projectService.transitionStatus(mockUser1, mockProject.id, 'READY');
      expect(updated.status).toBe('READY');
    });

    it('should forbid illegal transition directly from DRAFT to EXPORTED', async () => {
      await expect(
        projectService.transitionStatus(mockUser1, mockProject.id, 'EXPORTED'),
      ).rejects.toThrow(ConflictException);
    });

    it('should forbid illegal transition directly from DRAFT to RENDERED', async () => {
      await expect(
        projectService.transitionStatus(mockUser1, mockProject.id, 'RENDERED'),
      ).rejects.toThrow(ConflictException);
    });

    it('should forbid illegal transition from ANALYZING to EXPORTING', async () => {
      mockPrisma.gifProject.findUnique.mockResolvedValueOnce({
        ...mockProject,
        status: 'ANALYZING',
      });

      await expect(
        projectService.transitionStatus(mockUser1, mockProject.id, 'EXPORTING'),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow transition from ANALYZING to ANALYSIS_FAILED', async () => {
      mockPrisma.gifProject.findUnique.mockResolvedValueOnce({
        ...mockProject,
        status: 'ANALYZING',
      });

      const updated = await projectService.transitionStatus(
        mockUser1,
        mockProject.id,
        'ANALYSIS_FAILED',
        'Image corrupt',
      );
      expect(updated.status).toBe('ANALYSIS_FAILED');
    });
  });

  describe('IDOR & Security Boundary Enforcement', () => {
    it('should prevent unauthorized user from reading another user project', async () => {
      await expect(projectService.getProject(mockUser2, mockProject.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should prevent unauthorized user from modifying another user project', async () => {
      await expect(
        projectService.updateProject(mockUser2, mockProject.id, { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent unauthorized user from deleting another user project', async () => {
      await expect(
        projectService.deleteProject(mockUser2, mockProject.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Project Updates and Version History', () => {
    it('should create a new version snapshot when animationConfiguration is modified', async () => {
      await projectService.updateProject(mockUser1, mockProject.id, {
        animationConfiguration: {
          duration: 4.5,
          fps: 20,
          effects: [{ id: 'crt_scanlines', intensity: 0.5 }],
        },
      });

      expect(mockPrisma.gifProjectVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: mockProject.id,
            versionNumber: 2,
          }),
        }),
      );
    });

    it('should list historical version snapshots', async () => {
      const versions = await projectService.getProjectVersions(mockUser1, mockProject.id);
      expect(versions).toHaveLength(1);
      expect(versions[0].randomSeed).toBe('123456');
    });
  });

  describe('Project Image Analysis (Phase 2)', () => {
    it('should run algorithmic analysis, advance state to READY, and persist analysis result', async () => {
      const result = await projectService.analyzeProject(mockUser1, mockProject.id);

      expect(mockAssetService.getAssetFile).toHaveBeenCalledWith(mockAsset.id, mockUser1);
      expect(mockAnalyzerService.analyze).toHaveBeenCalled();
      expect(mockPrisma.gifAnalysisResult.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: mockProject.id },
          create: expect.objectContaining({
            width: 800,
            height: 600,
            darkSceneConfidence: 0.85,
            pixelArtConfidence: 0.88,
          }),
        }),
      );
      expect(mockPrisma.gifProject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProject.id },
          data: expect.objectContaining({
            status: 'READY',
            animationConfiguration: expect.objectContaining({
              pixelArtMode: true,
            }),
          }),
        }),
      );
      expect(result.analysis.width).toBe(800);
      expect(result.analysis.pixelArt.detected).toBe(true);
    });

    it('should transition to ANALYSIS_FAILED if image analysis encounters an exception', async () => {
      mockAnalyzerService.analyze.mockRejectedValueOnce(new Error('Corrupt chunk headers'));

      await expect(
        projectService.analyzeProject(mockUser1, mockProject.id),
      ).rejects.toThrow('Corrupt chunk headers');

      expect(mockPrisma.gifProject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProject.id },
          data: expect.objectContaining({
            status: 'ANALYSIS_FAILED',
          }),
        }),
      );
    });

    it('should retrieve stored analysis results', async () => {
      const analysis = await projectService.getProjectAnalysis(mockUser1, mockProject.id);
      expect(mockPrisma.gifAnalysisResult.findUnique).toHaveBeenCalledWith({
        where: { projectId: mockProject.id },
      });
      expect(analysis.width).toBe(800);
    });

    it('should prevent unauthorized users from triggering analysis', async () => {
      await expect(
        projectService.analyzeProject(mockUser2, mockProject.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Project Randomization (Phase 4)', () => {
    it('should randomize project configuration and create a new version snapshot', async () => {
      const result = await projectService.randomizeProject(mockUser1, mockProject.id, {
        profile: 'BALANCED',
        seed: 987654,
      });

      expect(result.project).toBeDefined();
      expect(result.randomizeResult.seed).toBe('987654');
      expect(mockPrisma.gifProject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProject.id },
          data: expect.objectContaining({
            randomSeed: BigInt(987654),
          }),
        }),
      );
      expect(mockPrisma.gifProjectVersion.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'GIF_PROJECT_RANDOMIZED',
          }),
        }),
      );
    });

    it('should throw NotFoundException if project does not exist during randomization', async () => {
      mockPrisma.gifProject.findUnique.mockResolvedValueOnce(null);
      await expect(
        projectService.randomizeProject(mockUser1, 'non-existent-proj'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the project during randomization', async () => {
      await expect(
        projectService.randomizeProject(mockUser2, mockProject.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});


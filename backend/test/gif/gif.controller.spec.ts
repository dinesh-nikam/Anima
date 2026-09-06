import { BadRequestException } from '@nestjs/common';
import { GifController } from '../../src/api/controllers/gif.controller';

describe('GifController — Phase 1 REST API Controller Endpoints', () => {
  let controller: GifController;
  let mockAssetService: any;
  let mockProjectService: any;

  const mockUser = { id: 'user-uuid-1', role: 'USER' };
  const mockReq = { user: mockUser } as any;

  const mockAsset = {
    id: 'asset-uuid-1',
    userId: mockUser.id,
    originalFilename: 'test.png',
    mimeType: 'image/png',
    width: 200,
    height: 200,
  };

  const mockProject = {
    id: 'proj-uuid-1',
    userId: mockUser.id,
    name: 'test',
    status: 'DRAFT',
    duration: 3.0,
    fps: 15,
  };

  let mockEffectRegistry: any;
  let mockAnimationEngine: any;

  beforeEach(() => {
    mockAssetService = {
      processAndStoreUpload: jest.fn().mockResolvedValue(mockAsset),
      getAssetFile: jest.fn().mockResolvedValue({
        buffer: Buffer.from('synthetic-file-content'),
        mimeType: 'image/png',
        filename: 'test.png',
      }),
    };

    mockProjectService = {
      createProject: jest.fn().mockResolvedValue(mockProject),
      listProjects: jest.fn().mockResolvedValue({
        items: [mockProject],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }),
      getProject: jest.fn().mockResolvedValue(mockProject),
      updateProject: jest.fn().mockResolvedValue({ ...mockProject, name: 'updated' }),
      transitionStatus: jest.fn().mockResolvedValue({ ...mockProject, status: 'READY' }),
      deleteProject: jest.fn().mockResolvedValue(undefined),
      getProjectVersions: jest.fn().mockResolvedValue([{ versionNumber: 1 }]),
      analyzeProject: jest.fn().mockResolvedValue({ project: mockProject, analysis: { width: 200 } }),
      getProjectAnalysis: jest.fn().mockResolvedValue({ width: 200, brightness: 0.5 }),
    };

    mockEffectRegistry = {
      getMetadataList: jest.fn().mockReturnValue([{ id: 'camera_zoom', name: 'Camera Zoom' }]),
      getMetadataById: jest.fn().mockReturnValue({ id: 'camera_zoom', name: 'Camera Zoom' }),
      validateCompatibility: jest.fn().mockReturnValue({ valid: true, conflicts: [] }),
    };

    mockAnimationEngine = {
      estimateBudget: jest.fn().mockReturnValue({
        totalFrames: 45,
        estimatedGifSizeBytes: 102400,
        aggregatePerformanceTier: 'LOW',
      }),
    };

    const mockRandomizeResult = {
      configuration: { duration: 3.0, fps: 15, effects: [] },
      seed: '12345',
      profile: 'BALANCED',
      selectedEffectCount: 2,
      preservedLockedCount: 0,
      appliedBiases: [],
    };

    const mockRandomizationEngine = {
      generateRandomConfiguration: jest.fn().mockReturnValue(mockRandomizeResult),
    };

    mockProjectService.randomizeProject = jest.fn().mockResolvedValue({
      project: mockProject,
      randomizeResult: mockRandomizeResult,
    });

    controller = new GifController(
      mockAssetService,
      mockProjectService,
      mockEffectRegistry,
      mockAnimationEngine,
      mockRandomizationEngine as any,
    );
  });

  it('should handle file upload and delegate to assetService', async () => {
    const file = {
      fieldname: 'file',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('mock-bytes'),
      size: 10,
    };

    const res = await controller.uploadImage(mockReq, file);
    expect(mockAssetService.processAndStoreUpload).toHaveBeenCalledWith(
      mockUser.id,
      file.buffer,
      file.originalname,
    );
    expect(res).toEqual(mockAsset);
  });

  it('should throw BadRequestException if file is missing in uploadImage', async () => {
    await expect(controller.uploadImage(mockReq, null as any)).rejects.toThrow(BadRequestException);
  });

  it('should stream asset file with proper HTTP headers', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as any;

    await controller.getAssetFile(mockReq, 'asset-uuid-1', mockRes);

    expect(mockAssetService.getAssetFile).toHaveBeenCalledWith('asset-uuid-1', mockUser.id);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=86400');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('should create project through projectService', async () => {
    const dto = { assetId: 'asset-uuid-1', name: 'New Project' };
    const res = await controller.createProject(mockReq, dto);
    expect(mockProjectService.createProject).toHaveBeenCalledWith(mockUser.id, dto);
    expect(res).toEqual(mockProject);
  });

  it('should list projects through projectService', async () => {
    const res = await controller.listProjects(mockReq, { page: 1, limit: 10 });
    expect(mockProjectService.listProjects).toHaveBeenCalledWith(mockUser.id, { page: 1, limit: 10 });
    expect(res.items).toHaveLength(1);
  });

  it('should retrieve project details by ID', async () => {
    const res = await controller.getProject(mockReq, 'proj-uuid-1');
    expect(mockProjectService.getProject).toHaveBeenCalledWith(mockUser.id, 'proj-uuid-1');
    expect(res.id).toBe('proj-uuid-1');
  });

  it('should update project configuration', async () => {
    const dto = { name: 'updated' };
    const res = await controller.updateProject(mockReq, 'proj-uuid-1', dto);
    expect(mockProjectService.updateProject).toHaveBeenCalledWith(mockUser.id, 'proj-uuid-1', dto);
    expect(res.name).toBe('updated');
  });

  it('should transition project status explicitly', async () => {
    const res = await controller.transitionStatus(mockReq, 'proj-uuid-1', {
      status: 'READY',
      reason: 'Validation completed',
    });
    expect(mockProjectService.transitionStatus).toHaveBeenCalledWith(
      mockUser.id,
      'proj-uuid-1',
      'READY',
      'Validation completed',
    );
    expect(res.status).toBe('READY');
  });

  it('should delete project', async () => {
    const res = await controller.deleteProject(mockReq, 'proj-uuid-1');
    expect(mockProjectService.deleteProject).toHaveBeenCalledWith(mockUser.id, 'proj-uuid-1');
    expect(res.message).toContain('deleted successfully');
  });

  it('should retrieve project versions', async () => {
    const res = await controller.getProjectVersions(mockReq, 'proj-uuid-1');
    expect(mockProjectService.getProjectVersions).toHaveBeenCalledWith(mockUser.id, 'proj-uuid-1');
    expect(res).toEqual([{ versionNumber: 1 }]);
  });

  it('should trigger image analysis on project via controller', async () => {
    const res = await controller.analyzeProject(mockReq, 'proj-uuid-1');
    expect(mockProjectService.analyzeProject).toHaveBeenCalledWith(mockUser.id, 'proj-uuid-1');
    expect(res.analysis.width).toBe(200);
  });

  it('should retrieve project analysis via controller', async () => {
    const res = await controller.getProjectAnalysis(mockReq, 'proj-uuid-1');
    expect(mockProjectService.getProjectAnalysis).toHaveBeenCalledWith(mockUser.id, 'proj-uuid-1');
    expect(res.brightness).toBe(0.5);
  });

  it('should list effects with optional category filter', async () => {
    const res = await controller.listEffects('CAMERA');
    expect(mockEffectRegistry.getMetadataList).toHaveBeenCalledWith('CAMERA');
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('camera_zoom');
  });

  it('should retrieve effect metadata by id', async () => {
    const res = await controller.getEffect('camera_zoom');
    expect(mockEffectRegistry.getMetadataById).toHaveBeenCalledWith('camera_zoom');
    expect(res.name).toBe('Camera Zoom');
  });

  it('should validate effect compatibility', async () => {
    const res = await controller.validateEffects(['camera_zoom']);
    expect(mockEffectRegistry.validateCompatibility).toHaveBeenCalledWith(['camera_zoom']);
    expect(res.valid).toBe(true);
  });

  it('should throw BadRequestException if effectIds is not an array', async () => {
    await expect(controller.validateEffects('invalid' as any)).rejects.toThrow(BadRequestException);
  });

  it('should estimate budget via animation engine', async () => {
    const dto = {
      width: 400,
      height: 400,
      duration: 3.0,
      fps: 15,
      effectIds: ['camera_zoom'],
    };
    const res = await controller.estimateBudget(dto);
    expect(mockAnimationEngine.estimateBudget).toHaveBeenCalledWith(dto);
    expect(res.totalFrames).toBe(45);
  });

  it('should trigger project randomization via controller', async () => {
    const dto = { profile: 'BALANCED' as const, seed: 12345 };
    const res = await controller.randomizeProject(mockReq, 'proj-uuid-1', dto);
    expect(mockProjectService.randomizeProject).toHaveBeenCalledWith(mockUser.id, 'proj-uuid-1', dto);
    expect(res.project).toBeDefined();
    expect(res.randomizeResult.seed).toBe('12345');
  });

  it('should run stateless preview randomization via controller', async () => {
    const dto = { profile: 'CHAOTIC' as const, seed: 99999 };
    const res = await controller.statelessRandomize(dto);
    expect(res.configuration).toBeDefined();
    expect(res.seed).toBe('12345');
  });
});



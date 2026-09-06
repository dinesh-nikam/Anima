import { ReadmeDraftService } from '../../src/application/readme/readme-draft.service';
import { ReadmeComponentRegistry } from '../../src/application/readme/registry/component-registry.service';
import { MarkdownRenderer } from '../../src/application/readme/renderers/markdown.renderer';
import { ThemeRegistry } from '../../src/application/readme/themes/theme.registry';
import { TemplateRegistry } from '../../src/application/readme/templates/template.registry';
import { HeroRenderer } from '../../src/application/readme/renderers/hero.renderer';
import {
  AboutRenderer,
  ProfileSummaryRenderer,
  ContactRenderer,
} from '../../src/application/readme/renderers/profile.renderers';
import {
  GithubStatsRenderer,
  StreakStatsRenderer,
  TopLanguagesRenderer,
  ContributionStatsRenderer,
} from '../../src/application/readme/renderers/statistics.renderers';
import { ProviderRegistry } from '../../src/application/readme/providers/provider.registry';
import { NotFoundException, ForbiddenException, BadRequestException, HttpException } from '@nestjs/common';

describe('ReadmeDraftService — Phase 7 Draft & Builder Core', () => {
  let service: ReadmeDraftService;
  let registry: ReadmeComponentRegistry;
  let markdownRenderer: MarkdownRenderer;
  let themeRegistry: ThemeRegistry;
  let templateRegistry: TemplateRegistry;
  let mockPrisma: any;
  let mockContextBuilder: any;

  const mockUserA = 'user-1111-aaaa';
  const mockUserB = 'user-2222-bbbb';

  const mockDraftA = {
    id: 'draft-uuid-1',
    userId: mockUserA,
    name: 'My Awesome Profile',
    description: 'Main README',
    templateId: 'professional-developer',
    templateVersion: '1.0.0',
    themeId: 'github-dark',
    themeVersion: '1.0.0',
    rendererVersion: '1.0.0',
    configuration: {},
    revision: 1,
    status: 'DRAFT',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastRenderedAt: null,
    sections: [
      {
        id: 'sec-1',
        draftId: 'draft-uuid-1',
        componentKey: 'hero',
        displayOrder: 10,
        enabled: true,
        configuration: { alignment: 'left', showBio: true, showAvatar: false },
        schemaVersion: '1.0.0',
        componentVersion: '1.0.0',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
      {
        id: 'sec-2',
        draftId: 'draft-uuid-1',
        componentKey: 'about',
        displayOrder: 20,
        enabled: true,
        configuration: { title: 'About Me', alignment: 'left' },
        schemaVersion: '1.0.0',
        componentVersion: '1.0.0',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ],
  };

  beforeEach(() => {
    registry = new ReadmeComponentRegistry();
    const providers = new ProviderRegistry();
    registry.register(new HeroRenderer());
    registry.register(new AboutRenderer());
    registry.register(new ProfileSummaryRenderer());
    registry.register(new ContactRenderer());
    registry.register(new GithubStatsRenderer(providers));
    registry.register(new StreakStatsRenderer(providers));
    registry.register(new TopLanguagesRenderer(providers));
    registry.register(new ContributionStatsRenderer());

    markdownRenderer = new MarkdownRenderer();
    themeRegistry = new ThemeRegistry();
    templateRegistry = new TemplateRegistry();

    mockContextBuilder = {
      build: jest.fn().mockResolvedValue({
        profile: {
          displayName: 'Ada Lovelace',
          bio: 'First Computer Programmer',
          githubLogin: 'adalovelace',
        },
        statistics: {
          repositories: { status: 'AVAILABLE', value: 42 },
          followers: { status: 'AVAILABLE', value: 128 },
          following: { status: 'AVAILABLE', value: 10 },
          stars: { status: 'AVAILABLE', value: 512 },
          forks: { status: 'AVAILABLE', value: 64 },
          contributions: { status: 'AVAILABLE', value: 1024, sourceUpdatedAt: '2026-01-01' },
          pullRequests: { status: 'AVAILABLE', value: 80 },
          issues: { status: 'AVAILABLE', value: 20 },
          reviews: { status: 'AVAILABLE', value: 50 },
        },
        streak: {
          current: { status: 'AVAILABLE', value: 15 },
          longest: { status: 'AVAILABLE', value: 45 },
        },
        languages: {
          items: {
            status: 'AVAILABLE',
            value: [{ name: 'TypeScript', percentage: 70, bytes: 70000 }],
          },
        },
        repositories: { items: { status: 'AVAILABLE', value: [] } },
        activity: { items: { status: 'AVAILABLE', value: [] } },
        achievements: { earned: { status: 'AVAILABLE', value: [] }, inProgress: { status: 'AVAILABLE', value: [] } },
        trophies: { items: { status: 'AVAILABLE', value: [] } },
        socialLinks: { items: { status: 'AVAILABLE', value: [] } },
        customData: { skills: { status: 'AVAILABLE', value: [] }, projects: { status: 'AVAILABLE', value: [] } },
        themeId: 'github-dark',
        providerResults: {},
        renderMetadata: {
          rendererVersion: '1.0.0',
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    };

    mockPrisma = {
      readmeDraft: {
        findMany: jest.fn().mockResolvedValue([mockDraftA]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'draft-uuid-1') return Promise.resolve(mockDraftA);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'draft-new-1', ...data, revision: 1 })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockDraftA, ...data })),
        delete: jest.fn().mockResolvedValue(mockDraftA),
      },
      readmeSectionInstance: {
        findMany: jest.fn().mockResolvedValue(mockDraftA.sections),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sec-new', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockDraftA.sections[0], ...data })),
        delete: jest.fn().mockResolvedValue(mockDraftA.sections[0]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn().mockImplementation((ops) => {
        if (typeof ops === 'function') return ops(mockPrisma);
        return Promise.all(ops);
      }),
    };

    service = new ReadmeDraftService(
      registry,
      markdownRenderer,
      themeRegistry,
      templateRegistry,
      mockContextBuilder,
    );
    // Inject mock prisma
    (service as any).prisma = mockPrisma;
  });

  describe('Draft Ownership & Retrieval', () => {
    it('returns drafts owned by authenticated user', async () => {
      const drafts = await service.listDrafts(mockUserA);
      expect(drafts).toHaveLength(1);
      expect(drafts[0].userId).toBe(mockUserA);
      expect(mockPrisma.readmeDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserA, status: { not: 'ARCHIVED' } },
        }),
      );
    });

    it('retrieves draft when requested by rightful owner', async () => {
      const draft = await service.getDraft(mockUserA, 'draft-uuid-1');
      expect(draft.id).toBe('draft-uuid-1');
      expect(draft.userId).toBe(mockUserA);
    });

    it('rejects access when User B requests User A draft (IDOR protection)', async () => {
      await expect(service.getDraft(mockUserB, 'draft-uuid-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when draft does not exist', async () => {
      await expect(service.getDraft(mockUserA, 'non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Optimistic Concurrency Control', () => {
    it('updates draft successfully when revision matches', async () => {
      const updated = await service.updateDraft(mockUserA, 'draft-uuid-1', {
        name: 'Updated Name',
        expectedRevision: 1, // matches mockDraftA.revision
      });
      expect(mockPrisma.readmeDraft.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'draft-uuid-1' },
          data: expect.objectContaining({
            name: 'Updated Name',
            revision: 2, // incremented
          }),
        }),
      );
    });

    it('rejects update with 409 Conflict when expectedRevision does not match', async () => {
      try {
        await service.updateDraft(mockUserA, 'draft-uuid-1', {
          name: 'Conflict Name',
          expectedRevision: 999, // mismatch (current is 1)
        });
        fail('Expected 409 Conflict exception');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(409);
        const response = err.getResponse();
        expect(response.code).toBe('README_DRAFT_CONFLICT');
        expect(response.serverRevision).toBe(1);
      }
    });
  });

  describe('Section Management & Ordering', () => {
    it('adds section with default settings and calculated order', async () => {
      await service.addSection(mockUserA, 'draft-uuid-1', {
        componentKey: 'contact',
        configuration: { title: 'Reach Out' },
      });

      expect(mockPrisma.readmeSectionInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            draftId: 'draft-uuid-1',
            componentKey: 'contact',
            displayOrder: 30, // max(10, 20) + 10
            configuration: expect.objectContaining({ title: 'Reach Out' }),
          }),
        }),
      );
    });

    it('rejects adding unregistered component', async () => {
      await expect(
        service.addSection(mockUserA, 'draft-uuid-1', {
          componentKey: 'invalid-component-key',
        }),
      ).rejects.toThrow();
    });

    it('reorders sections atomically with valid permutation', async () => {
      await service.reorderSections(mockUserA, 'draft-uuid-1', {
        sectionIds: ['sec-2', 'sec-1'],
      });

      expect(mockPrisma.readmeSectionInstance.update).toHaveBeenCalledWith({
        where: { id: 'sec-2' },
        data: { displayOrder: 10 },
      });
      expect(mockPrisma.readmeSectionInstance.update).toHaveBeenCalledWith({
        where: { id: 'sec-1' },
        data: { displayOrder: 20 },
      });
    });

    it('rejects reorder containing duplicate section IDs', async () => {
      await expect(
        service.reorderSections(mockUserA, 'draft-uuid-1', {
          sectionIds: ['sec-1', 'sec-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reorder containing foreign section ID', async () => {
      await expect(
        service.reorderSections(mockUserA, 'draft-uuid-1', {
          sectionIds: ['sec-1', 'foreign-sec-id'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reorder with incomplete section count', async () => {
      await expect(
        service.reorderSections(mockUserA, 'draft-uuid-1', {
          sectionIds: ['sec-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Template Application', () => {
    it('applies template in REPLACE mode', async () => {
      await service.applyTemplate(mockUserA, 'draft-uuid-1', {
        templateKey: 'minimal',
      });

      expect(mockPrisma.readmeSectionInstance.deleteMany).toHaveBeenCalledWith({
        where: { draftId: 'draft-uuid-1' },
      });
      expect(mockPrisma.readmeDraft.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'draft-uuid-1' },
          data: expect.objectContaining({
            templateId: 'minimal',
          }),
        }),
      );
    });

    it('rejects unknown template application', async () => {
      await expect(
        service.applyTemplate(mockUserA, 'draft-uuid-1', {
          templateKey: 'non-existent-template',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Draft Validation', () => {
    it('validates a correct draft as valid', async () => {
      const result = await service.validateDraft(mockUserA, 'draft-uuid-1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('flags invalid component configuration in draft', async () => {
      mockPrisma.readmeDraft.findUnique.mockResolvedValueOnce({
        ...mockDraftA,
        sections: [
          {
            id: 'sec-bad',
            componentKey: 'hero',
            configuration: { alignment: 'invalid-align-value' }, // enum failure
            enabled: true,
          },
        ],
      });

      const result = await service.validateDraft(mockUserA, 'draft-uuid-1');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Live Preview & Markdown Generation', () => {
    it('generates canonical Markdown preview for draft', async () => {
      const preview = await service.previewDraft(mockUserA, 'draft-uuid-1');
      expect(preview.markdown).toBeDefined();
      expect(typeof preview.markdown).toBe('string');
      expect(preview.markdown).toContain('Ada Lovelace');
      expect(preview.markdown).toContain('About Me');
      expect(preview.metadata.rendererVersion).toBe('1.0.0');
      expect(preview.validation.valid).toBe(true);
    });

    it('supports previewing working unsaved payload without mutating database', async () => {
      const preview = await service.previewDraft(mockUserA, 'draft-uuid-1', {
        themeId: 'tokyo-night',
        sections: [
          {
            componentKey: 'hero',
            enabled: true,
            configuration: { alignment: 'center', showBio: true },
          },
          {
            componentKey: 'contact',
            enabled: true,
            configuration: { title: 'Contact Ada' },
          },
        ],
      });

      expect(preview.markdown).toContain('Ada Lovelace');
      expect(preview.markdown).toContain('Contact Ada');
      expect(preview.metadata.themeId).toBe('tokyo-night');
    });

    it('retrieves canonical markdown endpoint response', async () => {
      const result = await service.getMarkdown(mockUserA, 'draft-uuid-1');
      expect(result.markdown).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Duplication & Deletion', () => {
    it('duplicates draft with cloned sections and new revision', async () => {
      const duplicated = await service.duplicateDraft(mockUserA, 'draft-uuid-1');
      expect(duplicated.name).toBe('My Awesome Profile (Copy)');
      expect(mockPrisma.readmeDraft.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserA,
            name: 'My Awesome Profile (Copy)',
            revision: 1,
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('deletes draft and cascades', async () => {
      const result = await service.deleteDraft(mockUserA, 'draft-uuid-1');
      expect(result.message).toContain('deleted');
      expect(mockPrisma.readmeDraft.delete).toHaveBeenCalledWith({
        where: { id: 'draft-uuid-1' },
      });
    });
  });
});

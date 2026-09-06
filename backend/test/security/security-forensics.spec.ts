import { EncryptionService } from '../../src/security/encryption.service';
import { MarkdownRenderer } from '../../src/application/readme/renderers/markdown.renderer';
import { ProviderUrlBuilder } from '../../src/application/readme/providers/provider-url.builder';
import { ProviderRegistry } from '../../src/application/readme/providers/provider.registry';
import { HealthService } from '../../src/infrastructure/external-services/health.service';
import { ReadmeDraftService } from '../../src/application/readme/readme-draft.service';
import { UnsafeUrlException } from '../../src/application/readme/exceptions/readme.exceptions';
import { ConfigService } from '@nestjs/config';

describe('Phase 10 — Security Hardening, Vulnerability & Forensic Verification', () => {
  // ==========================================================================
  // 1. TOKEN ENCRYPTION AT REST
  // ==========================================================================
  describe('Token Security & AES-256-CBC Encryption', () => {
    let encryptionService: EncryptionService;

    beforeEach(() => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'ENCRYPTION_KEY') return '12345678901234567890123456789012'; // 32 bytes
          return null;
        }),
      } as unknown as ConfigService;
      encryptionService = new EncryptionService(mockConfigService);
    });

    it('encrypts and decrypts sensitive OAuth tokens reliably', () => {
      const rawToken = 'ghp_secretTokenWithHighPrivileges1234567890!@#$%^&*()';
      const encrypted = encryptionService.encrypt(rawToken);

      expect(encrypted).not.toContain(rawToken);
      expect(encrypted).toContain(':'); // IV : ciphertext

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(rawToken);
    });

    it('rejects invalid key lengths on initialization', () => {
      const badConfig = {
        get: jest.fn(() => 'too-short-key'),
      } as unknown as ConfigService;

      expect(() => new EncryptionService(badConfig)).toThrow(
        'ENCRYPTION_KEY must be exactly 32 characters long',
      );
    });

    it('rejects malformed encrypted payload strings', () => {
      expect(() => encryptionService.decrypt('malformedPayloadWithoutColon')).toThrow(
        'Invalid encrypted data format',
      );
    });
  });

  // ==========================================================================
  // 2. MARKDOWN SECURITY & XSS DEFENSE
  // ==========================================================================
  describe('Markdown Security & HTML Sanitization', () => {
    let renderer: MarkdownRenderer;

    beforeEach(() => {
      renderer = new MarkdownRenderer();
    });

    it('strips <script> and dangerous tags from custom markdown', () => {
      const maliciousDoc: any = {
        blocks: [
          {
            type: 'CUSTOM_MARKDOWN',
            content: '<script>alert("xss")</script>### Safe Heading\n<style>body{display:none}</style>',
          },
        ],
      };

      const result = renderer.render(maliciousDoc);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('<style>');
      expect(result).toContain('### Safe Heading');
    });

    it('neutralizes onload, onerror and inline javascript execution in HTML blocks', () => {
      const maliciousDoc: any = {
        blocks: [
          {
            type: 'HTML_SAFE',
            content: '<img src="https://example.com/pic.png" onerror="alert(document.cookie)" />',
          },
        ],
      };

      const result = renderer.render(maliciousDoc);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('document.cookie');
    });

    it('rejects javascript:, data:, and file: URLs in images and links', () => {
      expect(renderer.isSafeImageUrl('javascript:alert(1)')).toBe(false);
      expect(renderer.isSafeImageUrl('data:image/svg+xml;base64,...')).toBe(false);
      expect(renderer.isSafeImageUrl('file:///etc/passwd')).toBe(false);
      expect(renderer.isSafeImageUrl('https://github-readme-stats.vercel.app/api')).toBe(true);

      expect(renderer.isSafeLinkUrl('javascript:evil()')).toBe(false);
      expect(renderer.isSafeLinkUrl('vbscript:msgbox()')).toBe(false);
      expect(renderer.isSafeLinkUrl('https://github.com/profile')).toBe(true);
    });
  });

  // ==========================================================================
  // 3. SSRF & PRIVATE NETWORK TARGET PREVENTION
  // ==========================================================================
  describe('SSRF & Network Isolation Defenses', () => {
    it('blocks loopback, private IPv4/IPv6, and cloud metadata targets in ProviderUrlBuilder', () => {
      const dangerousUrls = [
        'https://localhost/api/stats',
        'https://127.0.0.1/api/stats',
        'https://169.254.169.254/latest/meta-data/',
        'https://10.0.0.1/internal/health',
        'https://192.168.1.100/admin',
        'https://172.16.0.5/secrets',
        'https://internal.local/data',
        'https://metadata.google.internal/computeMetadata/v1/',
      ];

      for (const url of dangerousUrls) {
        expect(() => {
          ProviderUrlBuilder.assertUrlSafety('test-provider', url, ['localhost', '169.254.169.254', '127.0.0.1']);
        }).toThrow(UnsafeUrlException);
      }
    });

    it('enforces allowed hostnames whitelist for external providers', () => {
      expect(() => {
        ProviderUrlBuilder.assertUrlSafety(
          'github-stats',
          'https://malicious-phishing-domain.com/api',
          ['github-readme-stats.vercel.app', 'github-readme-stats-sigma-five.vercel.app'],
        );
      }).toThrow(UnsafeUrlException);
    });

    it('rejects URLs with embedded username:password userinfo', () => {
      expect(() => {
        ProviderUrlBuilder.assertUrlSafety(
          'github-stats',
          'https://admin:secretPass@github-readme-stats.vercel.app/api',
          ['github-readme-stats.vercel.app'],
        );
      }).toThrow(UnsafeUrlException);
    });
  });

  // ==========================================================================
  // 4. IDOR (INSECURE DIRECT OBJECT REFERENCE) DEFENSE
  // ==========================================================================
  describe('IDOR Tenant Isolation', () => {
    let draftService: ReadmeDraftService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        readmeDraft: {
          findUnique: jest.fn().mockImplementation(({ where }) => {
            if (where.id === 'draft-of-user-A') {
              return Promise.resolve({ id: 'draft-of-user-A', userId: 'user-A', name: 'Private Draft' });
            }
            return Promise.resolve(null);
          }),
        },
      };

      draftService = new ReadmeDraftService(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );
      (draftService as any).prisma = mockPrisma;
    });

    it('prevents User B from accessing or retrieving User A draft with ForbiddenException', async () => {
      // User B attempts to access User A's draft ID
      await expect(
        draftService.getDraft('user-B', 'draft-of-user-A'),
      ).rejects.toThrow('You do not have permission to access this draft');

      // Verify Prisma query looked up the draft
      expect(mockPrisma.readmeDraft.findUnique).toHaveBeenCalledWith({
        where: { id: 'draft-of-user-A' },
        include: expect.anything(),
      });
    });

    it('throws NotFoundException when accessing non-existent draft ID', async () => {
      await expect(
        draftService.getDraft('user-A', 'non-existent-draft'),
      ).rejects.toThrow('README draft not found: non-existent-draft');
    });
  });

  // ==========================================================================
  // 5. MULTI-TIER HEALTH CHECKS
  // ==========================================================================
  describe('Health Checks & Readiness Probe', () => {
    let healthService: HealthService;

    beforeEach(() => {
      const mockConfig = {
        get: jest.fn(() => null), // No real redis during unit test
      } as unknown as ConfigService;
      healthService = new HealthService(mockConfig);
    });

    it('returns structured health status distinguishing app, db, and redis', async () => {
      (healthService as any).prisma.$queryRaw = jest.fn().mockResolvedValue([{ '1': 1 }]);

      const result = await healthService.check();

      expect(result).toBeDefined();
      expect(result.status).toMatch(/ok|degraded|error/);
      expect(result.version).toBe('1.0.0');
      expect(result.checks.database.status).toBe('up');
      expect(typeof result.checks.database.latencyMs).toBe('number');
    });

    it('reports database failure cleanly as down with error details', async () => {
      (healthService as any).prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await healthService.check();

      expect(result.status).toBe('error');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.database.error).toContain('Connection refused');
    });
  });
});

import { ProviderUrlBuilder } from '../../src/application/readme/providers/provider-url.builder';
import { ProviderConfigurationException, UnsafeUrlException } from '../../src/application/readme/exceptions/readme.exceptions';

describe('ProviderUrlBuilder & Security Defense Suite', () => {
  describe('Parameter Validation', () => {
    it('validates username parameter correctly', () => {
      const validated = ProviderUrlBuilder.validateParameters(
        'test-provider',
        [{ name: 'username', type: 'username', required: true }],
        { username: 'octocat-dev' },
      );
      expect(validated['username']).toBe('octocat-dev');
    });

    it('rejects invalid username parameter containing illegal characters', () => {
      expect(() =>
        ProviderUrlBuilder.validateParameters(
          'test-provider',
          [{ name: 'username', type: 'username', required: true }],
          { username: 'user; rm -rf /' },
        ),
      ).toThrow(ProviderConfigurationException);
    });

    it('validates and converts numeric parameters', () => {
      const validated = ProviderUrlBuilder.validateParameters(
        'test-provider',
        [{ name: 'days', type: 'number', required: true }],
        { days: 30 },
      );
      expect(validated['days']).toBe('30');
    });

    it('rejects NaN numbers', () => {
      expect(() =>
        ProviderUrlBuilder.validateParameters(
          'test-provider',
          [{ name: 'days', type: 'number', required: true }],
          { days: 'not-a-number' },
        ),
      ).toThrow(ProviderConfigurationException);
    });

    it('validates enum values strictly', () => {
      const validated = ProviderUrlBuilder.validateParameters(
        'test-provider',
        [{ name: 'theme', type: 'enum', required: true, enumValues: ['dark', 'light'] }],
        { theme: 'dark' },
      );
      expect(validated['theme']).toBe('dark');

      expect(() =>
        ProviderUrlBuilder.validateParameters(
          'test-provider',
          [{ name: 'theme', type: 'enum', required: true, enumValues: ['dark', 'light'] }],
          { theme: 'malicious-theme' },
        ),
      ).toThrow(ProviderConfigurationException);
    });
  });

  describe('SSRF & Protocol Security Defense', () => {
    it('allows valid HTTPS URLs with matching allow-listed host', () => {
      expect(() =>
        ProviderUrlBuilder.assertUrlSafety(
          'github-stats',
          'https://github-readme-stats.vercel.app/api?username=octocat',
          ['github-readme-stats.vercel.app'],
        ),
      ).not.toThrow();
    });

    it('rejects plain HTTP protocol', () => {
      expect(() =>
        ProviderUrlBuilder.assertUrlSafety(
          'github-stats',
          'http://github-readme-stats.vercel.app/api?username=octocat',
          ['github-readme-stats.vercel.app'],
        ),
      ).toThrow(UnsafeUrlException);
    });

    it('rejects javascript: and data: pseudo-protocols', () => {
      expect(() =>
        ProviderUrlBuilder.assertUrlSafety(
          'custom-image',
          'javascript:alert(1)',
          [],
          true,
        ),
      ).toThrow(UnsafeUrlException);

      expect(() =>
        ProviderUrlBuilder.assertUrlSafety(
          'custom-image',
          'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
          [],
          true,
        ),
      ).toThrow(UnsafeUrlException);
    });

    it('rejects localhost, 127.0.0.1, and 0.0.0.0 (SSRF loopback)', () => {
      const loopbacks = [
        'https://localhost/stats',
        'https://127.0.0.1/api',
        'https://127.0.0.2:8080/metrics',
        'https://0.0.0.0/card',
        'https://[::1]/stats',
      ];

      for (const target of loopbacks) {
        expect(() =>
          ProviderUrlBuilder.assertUrlSafety('test', target, [], true),
        ).toThrow(UnsafeUrlException);
      }
    });

    it('rejects private IPv4 networks (RFC 1918)', () => {
      const privateIps = [
        'https://10.0.0.1/status',
        'https://172.16.0.1/api',
        'https://172.31.255.255/card',
        'https://192.168.1.1/image.png',
      ];

      for (const target of privateIps) {
        expect(() =>
          ProviderUrlBuilder.assertUrlSafety('test', target, [], true),
        ).toThrow(UnsafeUrlException);
      }
    });

    it('rejects cloud metadata IP addresses', () => {
      expect(() =>
        ProviderUrlBuilder.assertUrlSafety(
          'test',
          'https://169.254.169.254/latest/meta-data/',
          [],
          true,
        ),
      ).toThrow(UnsafeUrlException);
    });

    it('rejects userinfo embedded credentials in URL', () => {
      expect(() =>
        ProviderUrlBuilder.assertUrlSafety(
          'test',
          'https://user:password@github-readme-stats.vercel.app/api',
          ['github-readme-stats.vercel.app'],
        ),
      ).toThrow(UnsafeUrlException);
    });
  });
});

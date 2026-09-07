import { GithubClient } from '../../src/integration/github.client';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GithubClient', () => {
  let client: GithubClient;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GITHUB_API_BASE_URL') return 'https://api.github.com';
        if (key === 'GITHUB_CLIENT_ID') return 'test-client-id';
        if (key === 'GITHUB_CLIENT_SECRET') return 'test-client-secret';
        if (key === 'GITHUB_CALLBACK_URL') return 'http://localhost:3000/api/v1/auth/github/callback';
        return undefined;
      }),
    };
    client = new GithubClient(mockConfigService as ConfigService);
  });

  describe('verifyWriteAccess', () => {
    it('should return canWrite: true for active repository with push permissions', async () => {
      jest.spyOn(client, 'getRepository').mockResolvedValue({
        id: 123456,
        node_id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY=',
        name: 'my-repo',
        full_name: 'testuser/my-repo',
        owner: { login: 'testuser', id: 1 },
        private: false,
        html_url: 'https://github.com/testuser/my-repo',
        description: 'Test repository',
        fork: false,
        archived: false,
        disabled: false,
        default_branch: 'main',
        visibility: 'public',
        permissions: { admin: true, push: true, pull: true },
      });

      const result = await client.verifyWriteAccess('dummy-token', 'testuser', 'my-repo');
      expect(result.canWrite).toBe(true);
      expect(result.defaultBranch).toBe('main');
      expect(result.isArchived).toBe(false);
      expect(result.isDisabled).toBe(false);
      expect(result.repoId).toBe(123456);
    });

    it('should return canWrite: false when repository is archived', async () => {
      jest.spyOn(client, 'getRepository').mockResolvedValue({
        id: 123456,
        node_id: 'node',
        name: 'archived-repo',
        full_name: 'testuser/archived-repo',
        owner: { login: 'testuser', id: 1 },
        private: false,
        html_url: '',
        description: null,
        fork: false,
        archived: true,
        disabled: false,
        default_branch: 'main',
        visibility: 'public',
        permissions: { admin: true, push: true, pull: true },
      });

      const result = await client.verifyWriteAccess('dummy-token', 'testuser', 'archived-repo');
      expect(result.canWrite).toBe(false);
      expect(result.isArchived).toBe(true);
      expect(result.reason).toContain('archived');
    });

    it('should return canWrite: false when user lacks push/admin permissions', async () => {
      jest.spyOn(client, 'getRepository').mockResolvedValue({
        id: 9999,
        node_id: 'node',
        name: 'other-repo',
        full_name: 'otherowner/other-repo',
        owner: { login: 'otherowner', id: 2 },
        private: false,
        html_url: '',
        description: null,
        fork: false,
        archived: false,
        disabled: false,
        default_branch: 'main',
        visibility: 'public',
        permissions: { admin: false, push: false, pull: true },
      });

      const result = await client.verifyWriteAccess('dummy-token', 'otherowner', 'other-repo');
      expect(result.canWrite).toBe(false);
      expect(result.reason).toContain('write/push permissions');
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should include the configured callback and required scopes', () => {
      const authorizationUrl = new URL(client.getAuthorizationUrl('csrf-state'));

      expect(authorizationUrl.origin).toBe('https://github.com');
      expect(authorizationUrl.pathname).toBe('/login/oauth/authorize');
      expect(authorizationUrl.searchParams.get('client_id')).toBe('test-client-id');
      expect(authorizationUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/v1/auth/github/callback');
      expect(authorizationUrl.searchParams.get('state')).toBe('csrf-state');
      expect(authorizationUrl.searchParams.get('scope')).toBe('user:email,public_repo,repo');
    });
  });

  describe('getRepositoryContent', () => {
    it('should return exists: true and decoded UTF-8 content for base64 encoded response', async () => {
      const rawText = '# Test Profile\nHello world!';
      const base64Content = Buffer.from(rawText, 'utf8').toString('base64');

      jest.spyOn(client, 'request').mockResolvedValue({
        name: 'README.md',
        path: 'README.md',
        sha: 'abc123sha',
        size: rawText.length,
        type: 'file',
        content: base64Content,
        encoding: 'base64',
        html_url: 'https://github.com/testuser/repo/blob/main/README.md',
      });

      const result = await client.getRepositoryContent('dummy-token', 'testuser', 'repo', 'README.md', 'main');
      expect(result.exists).toBe(true);
      expect(result.content).toBe(rawText);
      expect(result.sha).toBe('abc123sha');
      expect(result.path).toBe('README.md');
    });

    it('should return exists: false when file 404s but repository exists', async () => {
      jest.spyOn(client, 'request').mockRejectedValueOnce(
        new HttpException('Not Found', HttpStatus.NOT_FOUND),
      );
      jest.spyOn(client, 'getRepository').mockResolvedValueOnce({
        id: 123,
        node_id: 'n',
        name: 'repo',
        full_name: 'testuser/repo',
        owner: { login: 'testuser', id: 1 },
        private: false,
        html_url: '',
        description: null,
        fork: false,
        archived: false,
        disabled: false,
        default_branch: 'main',
        visibility: 'public',
      });

      const result = await client.getRepositoryContent('dummy-token', 'testuser', 'repo', 'README.md');
      expect(result.exists).toBe(false);
      expect(result.content).toBeUndefined();
    });
  });

  describe('createOrUpdateRepositoryFile', () => {
    it('should encode content to base64 and forward SHA and commit message', async () => {
      const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({
        commit: {
          sha: 'commit-sha-789',
          node_id: 'n',
          url: '',
          html_url: 'https://github.com/testuser/repo/commit/commit-sha-789',
          author: { name: 'VeriFlow', email: 'bot@veriflow.dev', date: '' },
          committer: { name: 'VeriFlow', email: 'bot@veriflow.dev', date: '' },
          message: 'docs: update profile README',
        },
        content: {
          name: 'README.md',
          path: 'README.md',
          sha: 'new-file-sha-456',
          size: 100,
          url: '',
          html_url: '',
          type: 'file',
        },
      });

      const payload = {
        message: 'docs: update profile README',
        content: '# New Profile Markdown',
        sha: 'prev-file-sha-123',
        branch: 'main',
      };

      const result = await client.createOrUpdateRepositoryFile('dummy-token', 'testuser', 'repo', 'README.md', payload);

      expect(result.commit.sha).toBe('commit-sha-789');
      expect(result.content.sha).toBe('new-file-sha-456');

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/repos/testuser/repo/contents/README.md',
          data: expect.objectContaining({
            message: 'docs: update profile README',
            content: Buffer.from('# New Profile Markdown', 'utf8').toString('base64'),
            sha: 'prev-file-sha-123',
            branch: 'main',
          }),
        }),
        'dummy-token',
      );
    });
  });
});

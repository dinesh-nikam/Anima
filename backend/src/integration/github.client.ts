import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface GithubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface GithubRepositoryMetadata {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
  };
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  default_branch: string;
  visibility: string;
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
}

export interface GithubBranchInfo {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GithubContentResult {
  exists: boolean;
  name?: string;
  path?: string;
  sha?: string;
  size?: number;
  type?: 'file' | 'dir' | 'symlink' | 'submodule';
  content?: string; // Decoded UTF-8 content
  rawContent?: string; // Raw base64 content
  encoding?: string;
  html_url?: string;
  download_url?: string;
}

export interface GithubFileCommitResult {
  commit: {
    sha: string;
    node_id: string;
    url: string;
    html_url: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  content: {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    type: string;
  };
}

@Injectable()
export class GithubClient {
  private readonly logger = new Logger(GithubClient.name);
  private readonly api: AxiosInstance;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('GITHUB_API_BASE_URL') || 'https://api.github.com';
    this.clientId = this.configService.get<string>('GITHUB_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET') || '';

    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'VeriFlow-Profile-Builder',
      },
    });
  }

  /**
   * Generic request handler with rate limit extraction and error classification
   */
  async request<T>(config: any, token?: string): Promise<T> {
    const reqConfig = { ...config, headers: { ...(config.headers || {}) } };
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await this.api.request<T>(reqConfig);
      this.updateRateLimits(response.headers);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
    }
  }

  private updateRateLimits(headers: any) {
    if (!headers) return;
    const limit = parseInt(headers['x-ratelimit-limit']);
    const remaining = parseInt(headers['x-ratelimit-remaining']);
    const reset = parseInt(headers['x-ratelimit-reset']);

    if (!isNaN(limit)) {
      this.logger.debug(
        `GitHub rate limit: ${remaining}/${limit}, resets at ${new Date(reset * 1000).toISOString()}`,
      );
    }
  }

  private handleError(error: any): never {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data || {};
      const message = data.message || 'GitHub API error';

      if (status === 401) {
        throw new HttpException('GitHub token invalid or expired', HttpStatus.UNAUTHORIZED);
      }
      if (status === 403) {
        if (message.includes('rate limit') || message.includes('secondary rate limit')) {
          throw new HttpException('GitHub rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        }
        throw new HttpException(
          data.message || 'GitHub authorization failed: insufficient permissions or scope',
          HttpStatus.FORBIDDEN,
        );
      }
      if (status === 404) {
        throw new HttpException(message || 'GitHub resource not found', HttpStatus.NOT_FOUND);
      }
      if (status === 409) {
        throw new HttpException(
          message || 'GitHub conflict: file has been modified concurrently',
          HttpStatus.CONFLICT,
        );
      }
      if (status === 422) {
        throw new HttpException(
          message || 'GitHub validation error or branch protection restriction',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      this.logger.error(`GitHub API Error: ${status} - ${JSON.stringify(data)}`);
      throw new HttpException(message, status);
    }

    this.logger.error(`GitHub Network Error: ${error.message}`);
    throw new HttpException('GitHub network failure or timeout', HttpStatus.SERVICE_UNAVAILABLE);
  }

  async exchangeCodeForToken(code: string): Promise<{ access_token: string; scope: string; token_type: string }> {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      },
    );

    const data = response.data;
    if (data.error) {
      throw new HttpException(
        `GitHub OAuth Error: ${data.error_description || data.error}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return data;
  }

  async getUserProfile(token: string) {
    return this.request({ method: 'GET', url: '/user' }, token);
  }

  async getUserEmails(token: string): Promise<any[]> {
    return this.request({ method: 'GET', url: '/user/emails' }, token);
  }

  async getRepositories(token: string, page = 1, perPage = 100): Promise<any[]> {
    const data = await this.request<any[]>({
      method: 'GET',
      url: '/user/repos',
      params: { page, per_page: perPage, sort: 'updated' },
    }, token);
    return Array.isArray(data) ? data : [];
  }

  async getRepositoryLanguages(token: string, owner: string, repo: string) {
    return this.request({
      method: 'GET',
      url: `/repos/${owner}/${repo}/languages`,
    }, token);
  }

  /**
   * Fetch full repository metadata including write permissions and default branch
   */
  async getRepository(token: string, owner: string, repo: string): Promise<GithubRepositoryMetadata> {
    return this.request<GithubRepositoryMetadata>({
      method: 'GET',
      url: `/repos/${owner}/${repo}`,
    }, token);
  }

  /**
   * List branches of a repository
   */
  async getBranches(token: string, owner: string, repo: string, perPage = 100): Promise<GithubBranchInfo[]> {
    const data = await this.request<GithubBranchInfo[]>({
      method: 'GET',
      url: `/repos/${owner}/${repo}/branches`,
      params: { per_page: perPage },
    }, token);
    return Array.isArray(data) ? data : [];
  }

  /**
   * Get specific branch info
   */
  async getBranch(token: string, owner: string, repo: string, branch: string): Promise<GithubBranchInfo> {
    return this.request<GithubBranchInfo>({
      method: 'GET',
      url: `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    }, token);
  }

  /**
   * Fetch current repository file content.
   * If the file does not exist (404), returns { exists: false }.
   * If the repository itself does not exist or access is denied, throws appropriate exception.
   */
  async getRepositoryContent(
    token: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<GithubContentResult> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `/repos/${owner}/${repo}/contents/${cleanPath}`;
    const params: Record<string, string> = {};
    if (ref) {
      params.ref = ref;
    }

    try {
      const response = await this.request<any>({
        method: 'GET',
        url,
        params,
      }, token);

      if (Array.isArray(response)) {
        throw new HttpException(
          `Target path "${path}" is a directory, not a file`,
          HttpStatus.BAD_REQUEST,
        );
      }

      let decodedContent = '';
      if (response.content && response.encoding === 'base64') {
        // Base64 content might contain newlines in GitHub responses
        const sanitizedBase64 = response.content.replace(/\s/g, '');
        decodedContent = Buffer.from(sanitizedBase64, 'base64').toString('utf8');
      } else if (response.content) {
        decodedContent = response.content;
      }

      return {
        exists: true,
        name: response.name,
        path: response.path,
        sha: response.sha,
        size: response.size,
        type: response.type,
        content: decodedContent,
        rawContent: response.content,
        encoding: response.encoding,
        html_url: response.html_url,
        download_url: response.download_url,
      };
    } catch (error: any) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
        // Double check if repository exists to avoid masking repository 404 as file 404
        try {
          await this.getRepository(token, owner, repo);
          // Repository exists, so the file simply does not exist
          return { exists: false, path: cleanPath };
        } catch {
          // Repository doesn't exist or is not accessible
          throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Create or update a file in the repository (Safe GitHub Write).
   * Encodes content to base64, passes file SHA if updating, and passes commit message & branch.
   */
  async createOrUpdateRepositoryFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    payload: {
      message: string;
      content: string; // Plaintext UTF-8 content
      sha?: string; // Required when updating existing file
      branch: string;
      committer?: { name: string; email: string };
      author?: { name: string; email: string };
    },
  ): Promise<GithubFileCommitResult> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `/repos/${owner}/${repo}/contents/${cleanPath}`;

    // Base64 encode the plaintext UTF-8 content
    const base64Content = Buffer.from(payload.content, 'utf8').toString('base64');

    const body: Record<string, any> = {
      message: payload.message,
      content: base64Content,
      branch: payload.branch,
    };

    if (payload.sha) {
      body.sha = payload.sha;
    }
    if (payload.committer) {
      body.committer = payload.committer;
    }
    if (payload.author) {
      body.author = payload.author;
    }

    return this.request<GithubFileCommitResult>({
      method: 'PUT',
      url,
      data: body,
    }, token);
  }

  /**
   * Verify whether the authenticated token has write permission to the target repo
   */
  async verifyWriteAccess(
    token: string,
    owner: string,
    repo: string,
  ): Promise<{
    canWrite: boolean;
    reason?: string;
    defaultBranch: string;
    isArchived: boolean;
    isDisabled: boolean;
    repoId: number;
    fullName: string;
  }> {
    const metadata = await this.getRepository(token, owner, repo);

    if (metadata.archived) {
      return {
        canWrite: false,
        reason: 'Repository is archived and read-only',
        defaultBranch: metadata.default_branch,
        isArchived: true,
        isDisabled: metadata.disabled,
        repoId: metadata.id,
        fullName: metadata.full_name,
      };
    }

    if (metadata.disabled) {
      return {
        canWrite: false,
        reason: 'Repository is disabled',
        defaultBranch: metadata.default_branch,
        isArchived: metadata.archived,
        isDisabled: true,
        repoId: metadata.id,
        fullName: metadata.full_name,
      };
    }

    const hasPermission =
      metadata.permissions?.push === true ||
      metadata.permissions?.admin === true ||
      metadata.permissions?.maintain === true;

    if (!hasPermission) {
      return {
        canWrite: false,
        reason: 'Authenticated user lacks write/push permissions for this repository',
        defaultBranch: metadata.default_branch,
        isArchived: metadata.archived,
        isDisabled: metadata.disabled,
        repoId: metadata.id,
        fullName: metadata.full_name,
      };
    }

    return {
      canWrite: true,
      defaultBranch: metadata.default_branch,
      isArchived: metadata.archived,
      isDisabled: metadata.disabled,
      repoId: metadata.id,
      fullName: metadata.full_name,
    };
  }

  getAuthorizationUrl(state: string): string {
    const callbackUrl = this.configService.get<string>('GITHUB_CALLBACK_URL');
    return `https://github.com/login/oauth/authorize?client_id=${this.clientId}&state=${state}&scope=user:email,public_repo,repo`;
  }
}

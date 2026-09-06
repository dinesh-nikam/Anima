import { HttpException, HttpStatus } from '@nestjs/common';

export class ReadmePublishException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly errorCode: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        statusCode: status,
        errorCode,
        message,
        details: details || {},
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

export class RepositoryNotFoundException extends ReadmePublishException {
  constructor(owner: string, repo: string) {
    super(
      `GitHub repository ${owner}/${repo} was not found or is inaccessible`,
      HttpStatus.NOT_FOUND,
      'REPOSITORY_NOT_FOUND',
      { owner, repo },
    );
  }
}

export class RepositoryAccessDeniedException extends ReadmePublishException {
  constructor(owner: string, repo: string, reason?: string) {
    super(
      `Write access denied for repository ${owner}/${repo}${reason ? `: ${reason}` : ''}`,
      HttpStatus.FORBIDDEN,
      'REPOSITORY_ACCESS_DENIED',
      { owner, repo, reason },
    );
  }
}

export class BranchNotFoundException extends ReadmePublishException {
  constructor(owner: string, repo: string, branch: string) {
    super(
      `Branch "${branch}" was not found in repository ${owner}/${repo}`,
      HttpStatus.NOT_FOUND,
      'BRANCH_NOT_FOUND',
      { owner, repo, branch },
    );
  }
}

export class StalePublicationPreviewException extends ReadmePublishException {
  constructor(expectedSha: string | null, actualSha: string | null) {
    super(
      'The target repository README has been modified since the preview was generated. Please refresh the preview before publishing.',
      HttpStatus.CONFLICT,
      'STALE_PREVIEW',
      { expectedSha, actualSha },
    );
  }
}

export class PublicationIntentExpiredException extends ReadmePublishException {
  constructor(intentId: string) {
    super(
      'Publication preview intent has expired. Please generate a new preview.',
      HttpStatus.GONE,
      'INTENT_EXPIRED',
      { intentId },
    );
  }
}

export class PublicationIntentNotFoundException extends ReadmePublishException {
  constructor(intentId: string) {
    super(
      `Publication intent "${intentId}" was not found or does not belong to the current user`,
      HttpStatus.NOT_FOUND,
      'INTENT_NOT_FOUND',
      { intentId },
    );
  }
}

export class GithubAuthRequiredException extends ReadmePublishException {
  constructor(reason = 'GitHub OAuth token expired, revoked, or missing required write scope (repo or public_repo)') {
    super(
      reason,
      HttpStatus.UNAUTHORIZED,
      'GITHUB_AUTH_REQUIRED',
      { reauthRequired: true },
    );
  }
}

export class GithubRateLimitedException extends ReadmePublishException {
  constructor(resetTime?: Date) {
    super(
      `GitHub API rate limit exceeded${resetTime ? `. Resets at ${resetTime.toISOString()}` : ''}`,
      HttpStatus.TOO_MANY_REQUESTS,
      'GITHUB_RATE_LIMITED',
      { resetTime: resetTime?.toISOString() },
    );
  }
}

export class BranchProtectedException extends ReadmePublishException {
  constructor(branch: string, reason?: string) {
    super(
      `Branch "${branch}" is protected by GitHub branch protection rules${reason ? `: ${reason}` : ''}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'BRANCH_PROTECTED',
      { branch, reason },
    );
  }
}

export class PublicationConflictException extends ReadmePublishException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      HttpStatus.CONFLICT,
      'README_CONFLICT',
      details,
    );
  }
}

export class InvalidReadmePathException extends ReadmePublishException {
  constructor(path: string, reason: string) {
    super(
      `Invalid README file path "${path}": ${reason}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_PATH',
      { path, reason },
    );
  }
}

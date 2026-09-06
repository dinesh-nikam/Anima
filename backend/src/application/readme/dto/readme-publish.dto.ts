import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { ReadmeDiffResult, DiffSummary } from '../services/readme-diff.service';

export class CreatePublishPreviewDto {
  @IsOptional()
  @IsString()
  repositoryId?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  repo?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[^/\\][a-zA-Z0-9_\-./]+$/, {
    message: 'Path must be a valid relative repository file path without directory traversal (..)',
  })
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  commitMessage?: string;
}

export class ConfirmPublishDto {
  @IsString()
  @IsNotEmpty()
  intentId: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  commitMessage?: string;
}

export interface PublishTargetInfo {
  repositoryId: string;
  githubRepoId: string;
  owner: string;
  repo: string;
  fullName: string;
  branch: string;
  path: string;
  defaultBranch: string;
  visibility: string;
}

export interface PublishPreviewResponseDto {
  intentId: string;
  draftId: string;
  target: PublishTargetInfo;
  currentSha: string | null;
  renderedHash: string;
  changeStatus: 'CREATED' | 'CHANGED' | 'UNCHANGED';
  diff: ReadmeDiffResult;
  warnings: string[];
  expiresAt: string;
}

export interface PublicationReceiptDto {
  publicationId: string;
  draftId: string;
  versionId?: string | null;
  status: string;
  isNoOp: boolean;
  commitSha: string | null;
  publishedFileSha: string | null;
  previousFileSha: string | null;
  commitUrl: string | null;
  contentHash: string;
  target: {
    owner: string;
    repo: string;
    branch: string;
    path: string;
    fullName: string;
  };
  diffSummary?: DiffSummary | null;
  completedAt: string;
}

export interface TargetRepositoryItemDto {
  id: string;
  githubRepoId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  visibility: string;
  isArchived: boolean;
  isDisabled: boolean;
  canWrite: boolean;
  htmlUrl: string;
  pushedAt: string;
}

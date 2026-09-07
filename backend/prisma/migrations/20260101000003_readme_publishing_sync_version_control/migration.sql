-- Phase 8 — GitHub README Publishing, Synchronization & Version Control
-- Forward-only migration. Never modify already applied migrations.

-- ReadmePublicationStatus Enum ------------------------------------------------
CREATE TYPE "ReadmePublicationStatus" AS ENUM (
  'DRAFT',
  'READY',
  'PREVIEWED',
  'CONFIRMED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED',
  'STALE',
  'REAUTH_REQUIRED',
  'RATE_LIMITED',
  'CONFLICT',
  'NO_CHANGES'
);

-- AuditAction Enum Additions (Phase 8 Actions) --------------------------------
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_PUBLICATION_PREVIEWED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_PUBLICATION_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_PUBLICATION_STARTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_PUBLICATION_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_PUBLICATION_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_PUBLICATION_CONFLICT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_PUBLICATION_REAUTH_REQUIRED';

-- ReadmeVersion ---------------------------------------------------------------
CREATE TABLE "ReadmeVersion" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "draftId"            TEXT,
  "templateId"         TEXT NOT NULL,
  "templateVersion"    TEXT NOT NULL DEFAULT '1.0.0',
  "themeId"            TEXT NOT NULL,
  "themeVersion"       TEXT NOT NULL DEFAULT '1.0.0',
  "rendererVersion"    TEXT NOT NULL DEFAULT '1.0.0',
  "canonicalMarkdown"  TEXT NOT NULL,
  "contentHash"        TEXT NOT NULL,
  "sourceRevision"     INTEGER NOT NULL DEFAULT 1,
  "metadata"           JSONB NOT NULL DEFAULT '{}',
  "githubRepositoryId" TEXT,
  "branch"             TEXT,
  "path"               TEXT DEFAULT 'README.md',
  "commitSha"          TEXT,
  "previousFileSha"    TEXT,
  "fileSha"            TEXT,
  "status"             "ReadmePublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
  "capturedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReadmeVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadmeVersion_userId_idx" ON "ReadmeVersion"("userId");
CREATE INDEX "ReadmeVersion_draftId_idx" ON "ReadmeVersion"("draftId");
CREATE INDEX "ReadmeVersion_githubRepositoryId_idx" ON "ReadmeVersion"("githubRepositoryId");
CREATE INDEX "ReadmeVersion_contentHash_idx" ON "ReadmeVersion"("contentHash");
CREATE INDEX "ReadmeVersion_createdAt_idx" ON "ReadmeVersion"("createdAt");

ALTER TABLE "ReadmeVersion"
  ADD CONSTRAINT "ReadmeVersion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadmeVersion"
  ADD CONSTRAINT "ReadmeVersion_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "ReadmeDraft"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReadmeVersion"
  ADD CONSTRAINT "ReadmeVersion_githubRepositoryId_fkey"
  FOREIGN KEY ("githubRepositoryId") REFERENCES "GithubRepository"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ReadmePublishIntent ---------------------------------------------------------
CREATE TABLE "ReadmePublishIntent" (
  "id"                  TEXT NOT NULL,
  "userId"              TEXT NOT NULL,
  "draftId"             TEXT NOT NULL,
  "githubRepositoryId"  TEXT NOT NULL,
  "owner"               TEXT NOT NULL,
  "repo"                TEXT NOT NULL,
  "branch"              TEXT NOT NULL,
  "path"                TEXT NOT NULL DEFAULT 'README.md',
  "expectedCurrentSha"  TEXT,
  "renderedContentHash" TEXT NOT NULL,
  "canonicalMarkdown"   TEXT NOT NULL,
  "commitMessage"       TEXT,
  "diffSummary"         JSONB,
  "status"              "ReadmePublicationStatus" NOT NULL DEFAULT 'PREVIEWED',
  "expiresAt"           TIMESTAMP(3) NOT NULL,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadmePublishIntent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadmePublishIntent_userId_idx" ON "ReadmePublishIntent"("userId");
CREATE INDEX "ReadmePublishIntent_draftId_idx" ON "ReadmePublishIntent"("draftId");
CREATE INDEX "ReadmePublishIntent_expiresAt_idx" ON "ReadmePublishIntent"("expiresAt");
CREATE INDEX "ReadmePublishIntent_status_idx" ON "ReadmePublishIntent"("status");

ALTER TABLE "ReadmePublishIntent"
  ADD CONSTRAINT "ReadmePublishIntent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadmePublishIntent"
  ADD CONSTRAINT "ReadmePublishIntent_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "ReadmeDraft"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ReadmePublication -----------------------------------------------------------
CREATE TABLE "ReadmePublication" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "draftId"            TEXT NOT NULL,
  "versionId"          TEXT,
  "githubRepositoryId" TEXT NOT NULL,
  "owner"              TEXT NOT NULL,
  "repo"               TEXT NOT NULL,
  "branch"             TEXT NOT NULL,
  "path"               TEXT NOT NULL DEFAULT 'README.md',
  "previousFileSha"    TEXT,
  "publishedFileSha"   TEXT,
  "commitSha"          TEXT,
  "commitUrl"          TEXT,
  "contentHash"        TEXT NOT NULL,
  "status"             "ReadmePublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
  "errorCode"          TEXT,
  "errorMessage"       TEXT,
  "isNoOp"             BOOLEAN NOT NULL DEFAULT false,
  "diffSummary"        JSONB,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"        TIMESTAMP(3),
  CONSTRAINT "ReadmePublication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadmePublication_userId_idx" ON "ReadmePublication"("userId");
CREATE INDEX "ReadmePublication_draftId_idx" ON "ReadmePublication"("draftId");
CREATE INDEX "ReadmePublication_githubRepositoryId_idx" ON "ReadmePublication"("githubRepositoryId");
CREATE INDEX "ReadmePublication_status_idx" ON "ReadmePublication"("status");
CREATE INDEX "ReadmePublication_createdAt_idx" ON "ReadmePublication"("createdAt");

ALTER TABLE "ReadmePublication"
  ADD CONSTRAINT "ReadmePublication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadmePublication"
  ADD CONSTRAINT "ReadmePublication_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "ReadmeDraft"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadmePublication"
  ADD CONSTRAINT "ReadmePublication_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "ReadmeVersion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReadmePublication"
  ADD CONSTRAINT "ReadmePublication_githubRepositoryId_fkey"
  FOREIGN KEY ("githubRepositoryId") REFERENCES "GithubRepository"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

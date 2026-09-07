-- Migration: 20260101000005_gif_animation_studio
-- Phase 1 — Foundation + Upload + Project Model + Database
-- Forward-only migration. Never modify already applied migrations.

-- AuditAction Enum Additions --------------------------------------------------
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_IMAGE_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_PROJECT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_PROJECT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_PROJECT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_PROJECT_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_PROJECT_VERSION_SAVED';

-- GifProjectStatus Enum -------------------------------------------------------
CREATE TYPE "GifProjectStatus" AS ENUM (
  'DRAFT',
  'ANALYZING',
  'READY',
  'RENDERING',
  'RENDERED',
  'EXPORTING',
  'EXPORTED',
  'ANALYSIS_FAILED',
  'RENDER_FAILED',
  'EXPORT_FAILED',
  'CANCELLED'
);

-- GifAssetFormat Enum ---------------------------------------------------------
CREATE TYPE "GifAssetFormat" AS ENUM (
  'PNG',
  'JPEG',
  'WEBP',
  'GIF'
);

-- GifOutputFormat Enum --------------------------------------------------------
CREATE TYPE "GifOutputFormat" AS ENUM (
  'GIF',
  'MP4',
  'WEBM',
  'APNG'
);

-- GifAsset Table --------------------------------------------------------------
CREATE TABLE "GifAsset" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "originalFilename"  TEXT NOT NULL,
  "sanitizedFilename" TEXT NOT NULL,
  "storageKey"        TEXT NOT NULL,
  "mimeType"          TEXT NOT NULL,
  "format"            "GifAssetFormat" NOT NULL,
  "fileSizeBytes"     INTEGER NOT NULL,
  "fileHash"          TEXT NOT NULL,
  "width"             INTEGER NOT NULL,
  "height"            INTEGER NOT NULL,
  "hasAlpha"          BOOLEAN NOT NULL DEFAULT false,
  "metadata"          JSONB NOT NULL DEFAULT '{}',
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GifAsset_pkey" PRIMARY KEY ("id")
);

-- GifProject Table ------------------------------------------------------------
CREATE TABLE "GifProject" (
  "id"                     TEXT NOT NULL,
  "userId"                 TEXT NOT NULL,
  "name"                   TEXT NOT NULL,
  "originalAssetId"        TEXT NOT NULL,
  "originalImageHash"      TEXT NOT NULL,
  "width"                  INTEGER NOT NULL,
  "height"                 INTEGER NOT NULL,
  "format"                 "GifAssetFormat" NOT NULL,
  "animationConfiguration" JSONB NOT NULL DEFAULT '{}',
  "randomSeed"             BIGINT NOT NULL DEFAULT 0,
  "rendererVersion"        TEXT NOT NULL DEFAULT '1.0.0',
  "effectEngineVersion"    TEXT NOT NULL DEFAULT '1.0.0',
  "duration"               DOUBLE PRECISION NOT NULL DEFAULT 3.0,
  "fps"                    INTEGER NOT NULL DEFAULT 15,
  "outputFormat"           "GifOutputFormat" NOT NULL DEFAULT 'GIF',
  "outputWidth"            INTEGER NOT NULL,
  "outputHeight"           INTEGER NOT NULL,
  "status"                 "GifProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "statusReason"           TEXT,
  "metadata"               JSONB NOT NULL DEFAULT '{}',
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GifProject_pkey" PRIMARY KEY ("id")
);

-- GifProjectVersion Table -----------------------------------------------------
CREATE TABLE "GifProjectVersion" (
  "id"                     TEXT NOT NULL,
  "projectId"              TEXT NOT NULL,
  "versionNumber"          INTEGER NOT NULL,
  "animationConfiguration" JSONB NOT NULL DEFAULT '{}',
  "randomSeed"             BIGINT NOT NULL,
  "duration"               DOUBLE PRECISION NOT NULL,
  "fps"                    INTEGER NOT NULL,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GifProjectVersion_pkey" PRIMARY KEY ("id")
);

-- GifRenderJob Table ----------------------------------------------------------
CREATE TABLE "GifRenderJob" (
  "id"              TEXT NOT NULL,
  "projectId"       TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "status"          "GifProjectStatus" NOT NULL DEFAULT 'RENDERING',
  "progress"        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "totalFrames"     INTEGER NOT NULL DEFAULT 0,
  "renderedFrames"  INTEGER NOT NULL DEFAULT 0,
  "outputAssetPath" TEXT,
  "outputSizeBytes" INTEGER,
  "errorMessage"    TEXT,
  "startedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GifRenderJob_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints ----------------------------------------------------------
CREATE UNIQUE INDEX "GifAsset_storageKey_key" ON "GifAsset"("storageKey");
CREATE UNIQUE INDEX "GifProjectVersion_projectId_versionNumber_key" ON "GifProjectVersion"("projectId", "versionNumber");

-- Indexes ---------------------------------------------------------------------
CREATE INDEX "GifAsset_userId_idx" ON "GifAsset"("userId");
CREATE INDEX "GifAsset_fileHash_idx" ON "GifAsset"("fileHash");
CREATE INDEX "GifAsset_createdAt_idx" ON "GifAsset"("createdAt");

CREATE INDEX "GifProject_userId_idx" ON "GifProject"("userId");
CREATE INDEX "GifProject_originalAssetId_idx" ON "GifProject"("originalAssetId");
CREATE INDEX "GifProject_status_idx" ON "GifProject"("status");
CREATE INDEX "GifProject_randomSeed_idx" ON "GifProject"("randomSeed");
CREATE INDEX "GifProject_createdAt_idx" ON "GifProject"("createdAt");

CREATE INDEX "GifProjectVersion_projectId_idx" ON "GifProjectVersion"("projectId");
CREATE INDEX "GifProjectVersion_createdAt_idx" ON "GifProjectVersion"("createdAt");

CREATE INDEX "GifRenderJob_projectId_idx" ON "GifRenderJob"("projectId");
CREATE INDEX "GifRenderJob_userId_idx" ON "GifRenderJob"("userId");
CREATE INDEX "GifRenderJob_status_idx" ON "GifRenderJob"("status");
CREATE INDEX "GifRenderJob_createdAt_idx" ON "GifRenderJob"("createdAt");

-- Foreign Keys ----------------------------------------------------------------
ALTER TABLE "GifAsset" ADD CONSTRAINT "GifAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GifProject" ADD CONSTRAINT "GifProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GifProject" ADD CONSTRAINT "GifProject_originalAssetId_fkey" FOREIGN KEY ("originalAssetId") REFERENCES "GifAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GifProjectVersion" ADD CONSTRAINT "GifProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "GifProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GifRenderJob" ADD CONSTRAINT "GifRenderJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "GifProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

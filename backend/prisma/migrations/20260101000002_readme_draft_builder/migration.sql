-- Phase 7 — Visual README Builder & Interactive Editor
-- Forward-only migration. No destructive modifications to existing tables.

-- ReadmeDraftStatus Enum ----------------------------------------------------
CREATE TYPE "ReadmeDraftStatus" AS ENUM ('DRAFT', 'VALID', 'INVALID', 'ARCHIVED');

-- AuditAction Enum Alteration (Phase 7 Actions) ------------------------------
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_DRAFT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_DRAFT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_DRAFT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_DRAFT_DUPLICATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_TEMPLATE_APPLIED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_THEME_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_RENDERED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_VALIDATION_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'README_DRAFT_CONFLICT';

-- ReadmeDraft ---------------------------------------------------------------
CREATE TABLE "ReadmeDraft" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "templateId"      TEXT,
  "templateVersion" TEXT NOT NULL DEFAULT '1.0.0',
  "themeId"         TEXT NOT NULL DEFAULT 'github-dark',
  "themeVersion"    TEXT NOT NULL DEFAULT '1.0.0',
  "rendererVersion" TEXT NOT NULL DEFAULT '1.0.0',
  "configuration"   JSONB NOT NULL DEFAULT '{}',
  "revision"        INTEGER NOT NULL DEFAULT 1,
  "status"          "ReadmeDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  "lastRenderedAt"  TIMESTAMP(3),
  CONSTRAINT "ReadmeDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadmeDraft_userId_idx" ON "ReadmeDraft"("userId");
CREATE INDEX "ReadmeDraft_status_idx" ON "ReadmeDraft"("status");
CREATE INDEX "ReadmeDraft_userId_updatedAt_idx" ON "ReadmeDraft"("userId", "updatedAt");

ALTER TABLE "ReadmeDraft"
  ADD CONSTRAINT "ReadmeDraft_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ReadmeSectionInstance -----------------------------------------------------
CREATE TABLE "ReadmeSectionInstance" (
  "id"               TEXT NOT NULL,
  "draftId"          TEXT NOT NULL,
  "componentKey"     TEXT NOT NULL,
  "displayOrder"     INTEGER NOT NULL DEFAULT 0,
  "enabled"          BOOLEAN NOT NULL DEFAULT true,
  "configuration"    JSONB NOT NULL DEFAULT '{}',
  "schemaVersion"    TEXT NOT NULL DEFAULT '1.0.0',
  "componentVersion" TEXT NOT NULL DEFAULT '1.0.0',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadmeSectionInstance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadmeSectionInstance_draftId_idx" ON "ReadmeSectionInstance"("draftId");
CREATE INDEX "ReadmeSectionInstance_componentKey_idx" ON "ReadmeSectionInstance"("componentKey");
CREATE INDEX "ReadmeSectionInstance_draftId_displayOrder_idx" ON "ReadmeSectionInstance"("draftId", "displayOrder");

ALTER TABLE "ReadmeSectionInstance"
  ADD CONSTRAINT "ReadmeSectionInstance_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "ReadmeDraft"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

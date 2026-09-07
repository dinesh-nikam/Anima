-- Phase 9 — Dynamic Provider Ecosystem, Badges & External Integration Engine
-- Forward-only migration. Never modify already applied migrations.

-- ReadmeProviderCategory Enum Additions ---------------------------------------
ALTER TYPE "ReadmeProviderCategory" ADD VALUE IF NOT EXISTS 'CONTRIBUTIONS';
ALTER TYPE "ReadmeProviderCategory" ADD VALUE IF NOT EXISTS 'ACHIEVEMENTS';
ALTER TYPE "ReadmeProviderCategory" ADD VALUE IF NOT EXISTS 'ACTIVITY';

-- ProviderStatus Enum ---------------------------------------------------------
CREATE TYPE "ProviderStatus" AS ENUM (
  'ENABLED',
  'DISABLED',
  'DEGRADED',
  'UNAVAILABLE',
  'DEPRECATED'
);

-- ProviderCapability Enum -----------------------------------------------------
CREATE TYPE "ProviderCapability" AS ENUM (
  'STATIC_MARKDOWN',
  'DYNAMIC_IMAGE',
  'PROFILE_DATA',
  'STATISTICS',
  'CONTRIBUTION_DATA',
  'BADGE',
  'TROPHY'
);

-- ProviderFallbackPolicy Enum -------------------------------------------------
CREATE TYPE "ProviderFallbackPolicy" AS ENUM (
  'HIDE',
  'FALLBACK_TO_INTERNAL',
  'SHOW_UNAVAILABLE',
  'USE_STATIC_FALLBACK'
);

-- AuditAction Enum Additions (Phase 9 Actions) --------------------------------
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROVIDER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROVIDER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROVIDER_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROVIDER_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROVIDER_CONFIGURED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROVIDER_DEPRECATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROVIDER_HEALTH_CHECKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROVIDER_FAILURE';

-- DynamicProvider -------------------------------------------------------------
CREATE TABLE "DynamicProvider" (
  "id"                   TEXT NOT NULL,
  "providerKey"          TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "description"          TEXT NOT NULL,
  "category"             "ReadmeProviderCategory" NOT NULL,
  "version"              TEXT NOT NULL DEFAULT '1.0.0',
  "status"               "ProviderStatus" NOT NULL DEFAULT 'ENABLED',
  "capabilities"         "ProviderCapability"[] DEFAULT ARRAY[]::"ProviderCapability"[],
  "supportedComponents"  TEXT[] DEFAULT ARRAY[]::TEXT[],
  "baseUrl"              TEXT NOT NULL,
  "allowedHosts"         TEXT[] DEFAULT ARRAY[]::TEXT[],
  "configurationSchema"  JSONB NOT NULL DEFAULT '[]',
  "defaultConfiguration" JSONB NOT NULL DEFAULT '{}',
  "documentationUrl"     TEXT,
  "isSystem"             BOOLEAN NOT NULL DEFAULT false,
  "lastCheckedAt"        TIMESTAMP(3),
  "lastSuccessAt"        TIMESTAMP(3),
  "lastFailureAt"        TIMESTAMP(3),
  "failureCount"         INTEGER NOT NULL DEFAULT 0,
  "latencyMs"            INTEGER,
  "errorCategory"        TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DynamicProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DynamicProvider_providerKey_key" ON "DynamicProvider"("providerKey");
CREATE INDEX "DynamicProvider_status_idx" ON "DynamicProvider"("status");
CREATE INDEX "DynamicProvider_category_idx" ON "DynamicProvider"("category");

-- ProviderConfig --------------------------------------------------------------
CREATE TABLE "ProviderConfig" (
  "id"            TEXT NOT NULL,
  "providerId"    TEXT NOT NULL,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "status"        "ProviderStatus" NOT NULL DEFAULT 'ENABLED',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProviderConfig_providerId_idx" ON "ProviderConfig"("providerId");

ALTER TABLE "ProviderConfig"
  ADD CONSTRAINT "ProviderConfig_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "DynamicProvider"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 6 — README Template, Theme & Component Rendering Engine
-- Forward-only. No destructive operations.
-- All new tables; no modifications to existing schema.

-- Enums ---------------------------------------------------------------------
CREATE TYPE "ReadmeTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED', 'DISABLED');

CREATE TYPE "ReadmeProviderCategory" AS ENUM (
  'GITHUB_STATS',
  'STREAK',
  'TOP_LANGUAGES',
  'TROPHIES',
  'BADGES',
  'VISITOR_COUNTER',
  'CUSTOM_IMAGE'
);

-- ReadmeTheme ---------------------------------------------------------------
CREATE TABLE "ReadmeTheme" (
  "id"            TEXT NOT NULL,
  "themeKey"      TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "version"       TEXT NOT NULL DEFAULT '1.0.0',
  "configuration" JSONB NOT NULL,
  "isSystem"      BOOLEAN NOT NULL DEFAULT false,
  "enabled"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadmeTheme_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadmeTheme_themeKey_key" ON "ReadmeTheme"("themeKey");
CREATE INDEX "ReadmeTheme_enabled_idx" ON "ReadmeTheme"("enabled");

-- ReadmeComponentDefinition -------------------------------------------------
CREATE TABLE "ReadmeComponentDefinition" (
  "id"                   TEXT NOT NULL,
  "componentKey"         TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "description"          TEXT NOT NULL,
  "category"             TEXT NOT NULL,
  "version"              TEXT NOT NULL DEFAULT '1.0.0',
  "configurationSchema"  JSONB NOT NULL,
  "defaultConfiguration" JSONB NOT NULL,
  "requiredData"         TEXT[],
  "optionalData"         TEXT[],
  "supportedThemes"      TEXT[],
  "enabled"              BOOLEAN NOT NULL DEFAULT true,
  "displayOrder"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadmeComponentDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadmeComponentDefinition_componentKey_key" ON "ReadmeComponentDefinition"("componentKey");
CREATE INDEX "ReadmeComponentDefinition_enabled_idx" ON "ReadmeComponentDefinition"("enabled");
CREATE INDEX "ReadmeComponentDefinition_category_idx" ON "ReadmeComponentDefinition"("category");

-- ReadmeProviderDefinition --------------------------------------------------
CREATE TABLE "ReadmeProviderDefinition" (
  "id"              TEXT NOT NULL,
  "providerKey"     TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "category"        "ReadmeProviderCategory" NOT NULL,
  "baseUrl"         TEXT NOT NULL,
  "allowedHosts"    TEXT[],
  "parameterSchema" JSONB NOT NULL,
  "enabled"         BOOLEAN NOT NULL DEFAULT true,
  "version"         TEXT NOT NULL DEFAULT '1.0.0',
  "configuration"   JSONB NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadmeProviderDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadmeProviderDefinition_providerKey_key" ON "ReadmeProviderDefinition"("providerKey");
CREATE INDEX "ReadmeProviderDefinition_enabled_idx" ON "ReadmeProviderDefinition"("enabled");
CREATE INDEX "ReadmeProviderDefinition_category_idx" ON "ReadmeProviderDefinition"("category");

-- ReadmeTemplate ------------------------------------------------------------
CREATE TABLE "ReadmeTemplate" (
  "id"            TEXT NOT NULL,
  "templateKey"   TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "version"       TEXT NOT NULL DEFAULT '1.0.0',
  "status"        "ReadmeTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "themeId"       TEXT,
  "configuration" JSONB NOT NULL,
  "schemaVersion" TEXT NOT NULL DEFAULT '1.0.0',
  "isSystem"      BOOLEAN NOT NULL DEFAULT false,
  "createdBy"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadmeTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadmeTemplate_templateKey_version_key" ON "ReadmeTemplate"("templateKey", "version");
CREATE INDEX "ReadmeTemplate_templateKey_idx" ON "ReadmeTemplate"("templateKey");
CREATE INDEX "ReadmeTemplate_status_idx" ON "ReadmeTemplate"("status");

ALTER TABLE "ReadmeTemplate"
  ADD CONSTRAINT "ReadmeTemplate_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "ReadmeTheme"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ReadmeTemplateSection -----------------------------------------------------
CREATE TABLE "ReadmeTemplateSection" (
  "id"            TEXT NOT NULL,
  "templateId"    TEXT NOT NULL,
  "sectionKey"    TEXT NOT NULL,
  "componentId"   TEXT NOT NULL,
  "displayOrder"  INTEGER NOT NULL DEFAULT 0,
  "configuration" JSONB NOT NULL,
  "enabled"       BOOLEAN NOT NULL DEFAULT true,
  "schemaVersion" TEXT NOT NULL DEFAULT '1.0.0',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadmeTemplateSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadmeTemplateSection_templateId_sectionKey_key" ON "ReadmeTemplateSection"("templateId", "sectionKey");
CREATE INDEX "ReadmeTemplateSection_templateId_idx" ON "ReadmeTemplateSection"("templateId");
CREATE INDEX "ReadmeTemplateSection_componentId_idx" ON "ReadmeTemplateSection"("componentId");

ALTER TABLE "ReadmeTemplateSection"
  ADD CONSTRAINT "ReadmeTemplateSection_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ReadmeTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadmeTemplateSection"
  ADD CONSTRAINT "ReadmeTemplateSection_componentId_fkey"
  FOREIGN KEY ("componentId") REFERENCES "ReadmeComponentDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration: 20260101000007_gif_effect_registry
-- Phase 3 — Effect Registry & Animation Engine Architecture
-- Forward-only migration. Never modify already applied migrations.

-- AuditAction Enum Addition ---------------------------------------------------
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_EFFECT_CONFIGURED';

-- GifEffectDefinition Table ---------------------------------------------------
CREATE TABLE "GifEffectDefinition" (
  "id"                   TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "category"             TEXT NOT NULL,
  "description"          TEXT NOT NULL,
  "supportedImageTypes"  TEXT[] DEFAULT ARRAY[]::TEXT[],
  "compatibility"        TEXT[] DEFAULT ARRAY[]::TEXT[],
  "intensityMin"         DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "intensityMax"         DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "intensityDefault"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "defaultParameters"    JSONB NOT NULL DEFAULT '{}',
  "performanceCost"      TEXT NOT NULL DEFAULT 'LOW',
  "isLoopSafe"           BOOLEAN NOT NULL DEFAULT true,
  "requiresSegmentation" BOOLEAN NOT NULL DEFAULT false,
  "modifiesGeometry"     BOOLEAN NOT NULL DEFAULT false,
  "modifiesColors"       BOOLEAN NOT NULL DEFAULT false,
  "generatesParticles"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GifEffectDefinition_pkey" PRIMARY KEY ("id")
);

-- Indexes ---------------------------------------------------------------------
CREATE INDEX "GifEffectDefinition_category_idx" ON "GifEffectDefinition"("category");
CREATE INDEX "GifEffectDefinition_performanceCost_idx" ON "GifEffectDefinition"("performanceCost");

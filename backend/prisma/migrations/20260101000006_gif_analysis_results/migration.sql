-- Migration: 20260101000006_gif_analysis_results
-- Phase 2 — Image Analysis & Characteristic Extraction
-- Forward-only migration. Never modify already applied migrations.

-- AuditAction Enum Addition ---------------------------------------------------
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_IMAGE_ANALYZED';

-- GifAnalysisResult Table -----------------------------------------------------
CREATE TABLE "GifAnalysisResult" (
  "id"                       TEXT NOT NULL,
  "projectId"                TEXT NOT NULL,
  "assetId"                  TEXT NOT NULL,
  "width"                    INTEGER NOT NULL,
  "height"                   INTEGER NOT NULL,
  "aspectRatio"              DOUBLE PRECISION NOT NULL,
  "hasAlpha"                 BOOLEAN NOT NULL DEFAULT false,
  "alphaCoverage"            DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "brightness"               DOUBLE PRECISION NOT NULL,
  "contrast"                 DOUBLE PRECISION NOT NULL,
  "edgeDensity"              DOUBLE PRECISION NOT NULL,
  "complexity"               DOUBLE PRECISION NOT NULL,
  "darkSceneConfidence"      DOUBLE PRECISION NOT NULL,
  "pixelArtConfidence"       DOUBLE PRECISION NOT NULL,
  "photographicConfidence"   DOUBLE PRECISION NOT NULL,
  "flatAreaRatio"            DOUBLE PRECISION NOT NULL,
  "dominantColors"           JSONB NOT NULL DEFAULT '[]',
  "uniqueColorCount"         INTEGER NOT NULL DEFAULT 0,
  "features"                 JSONB NOT NULL DEFAULT '{}',
  "segmentationStatus"       TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  "characterDetectionStatus" TEXT NOT NULL DEFAULT 'NOT_SUPPORTED',
  "analyzerVersion"          TEXT NOT NULL DEFAULT '1.0.0',
  "analysisDurationMs"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GifAnalysisResult_pkey" PRIMARY KEY ("id")
);

-- Unique Constraint on projectId ----------------------------------------------
CREATE UNIQUE INDEX "GifAnalysisResult_projectId_key" ON "GifAnalysisResult"("projectId");

-- Indexes ---------------------------------------------------------------------
CREATE INDEX "GifAnalysisResult_projectId_idx" ON "GifAnalysisResult"("projectId");
CREATE INDEX "GifAnalysisResult_assetId_idx" ON "GifAnalysisResult"("assetId");
CREATE INDEX "GifAnalysisResult_createdAt_idx" ON "GifAnalysisResult"("createdAt");

-- Foreign Key to GifProject ---------------------------------------------------
ALTER TABLE "GifAnalysisResult" ADD CONSTRAINT "GifAnalysisResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "GifProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

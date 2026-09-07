-- Migration: 20260101000008_gif_randomization_engine
-- Phase 4 — Randomization Engine Architecture
-- Forward-only migration. Never modify already applied migrations.

-- AuditAction Enum Addition ---------------------------------------------------
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GIF_PROJECT_RANDOMIZED';

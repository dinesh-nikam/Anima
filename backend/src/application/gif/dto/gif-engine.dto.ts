import {
  IsNumber,
  Min,
  Max,
  IsArray,
  IsOptional,
  IsBoolean,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GIF_RESOURCE_LIMITS } from '../models/gif.model';
import { PerformanceCostTier } from '../effects/effect.contract';

export class EstimateBudgetDto {
  @IsNumber()
  @Min(GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX)
  @Max(GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX)
  @Type(() => Number)
  width: number;

  @IsNumber()
  @Min(GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX)
  @Max(GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX)
  @Type(() => Number)
  height: number;

  @IsNumber()
  @Min(GIF_RESOURCE_LIMITS.MIN_DURATION_SECONDS)
  @Max(GIF_RESOURCE_LIMITS.MAX_DURATION_SECONDS)
  @Type(() => Number)
  duration: number;

  @IsNumber()
  @Min(GIF_RESOURCE_LIMITS.MIN_FPS)
  @Max(GIF_RESOURCE_LIMITS.MAX_FPS)
  @Type(() => Number)
  fps: number;

  @IsArray()
  @IsOptional()
  effectIds?: string[];

  @IsBoolean()
  @IsOptional()
  dithering?: boolean;

  @IsBoolean()
  @IsOptional()
  pixelArtMode?: boolean;
}

export interface AnimationBudgetEstimate {
  totalFrames: number;
  frameDelayCentiseconds: number;
  uncompressedFrameSizeBytes: number;
  totalRawMemoryBytes: number;
  estimatedGifSizeBytes: number;
  estimatedGifSizeFormatted: string;
  estimatedRenderTimeMs: number;
  estimatedRenderTimeFormatted: string;
  aggregatePerformanceTier: PerformanceCostTier;
  warnings: string[];
  recommendations: string[];
}

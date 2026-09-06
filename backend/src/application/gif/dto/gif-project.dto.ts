import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsIn,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GifProjectStatus, GIF_RESOURCE_LIMITS } from '../models/gif.model';

export class CreateGifProjectDto {
  @IsUUID()
  @IsNotEmpty()
  assetId: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(GIF_RESOURCE_LIMITS.MIN_DURATION_SECONDS)
  @Max(GIF_RESOURCE_LIMITS.MAX_DURATION_SECONDS)
  @Type(() => Number)
  duration?: number;

  @IsNumber()
  @IsOptional()
  @Min(GIF_RESOURCE_LIMITS.MIN_FPS)
  @Max(GIF_RESOURCE_LIMITS.MAX_FPS)
  @Type(() => Number)
  fps?: number;

  @IsNumber()
  @IsOptional()
  @Min(GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX)
  @Max(GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX)
  @Type(() => Number)
  outputWidth?: number;

  @IsNumber()
  @IsOptional()
  @Min(GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX)
  @Max(GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX)
  @Type(() => Number)
  outputHeight?: number;

  @IsOptional()
  seed?: string | number;
}

export class UpdateGifProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(GIF_RESOURCE_LIMITS.MIN_DURATION_SECONDS)
  @Max(GIF_RESOURCE_LIMITS.MAX_DURATION_SECONDS)
  @Type(() => Number)
  duration?: number;

  @IsNumber()
  @IsOptional()
  @Min(GIF_RESOURCE_LIMITS.MIN_FPS)
  @Max(GIF_RESOURCE_LIMITS.MAX_FPS)
  @Type(() => Number)
  fps?: number;

  @IsNumber()
  @IsOptional()
  @Min(GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX)
  @Max(GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX)
  @Type(() => Number)
  outputWidth?: number;

  @IsNumber()
  @IsOptional()
  @Min(GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX)
  @Max(GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX)
  @Type(() => Number)
  outputHeight?: number;

  @IsOptional()
  randomSeed?: string | number;

  @IsObject()
  @IsOptional()
  animationConfiguration?: Record<string, any>;

  @IsString()
  @IsOptional()
  @IsIn([
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
    'CANCELLED',
  ])
  status?: GifProjectStatus;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  statusReason?: string;
}

export class TransitionProjectStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
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
    'CANCELLED',
  ])
  status: GifProjectStatus;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}

export class QueryGifProjectsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  search?: string;
}

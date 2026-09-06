import {
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DitherMode {
  FLOYD_STEINBERG = 'FLOYD_STEINBERG',
  BAYER = 'BAYER',
  NONE = 'NONE',
}

export class TriggerRenderDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(10.0)
  duration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(30)
  fps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(16)
  @Max(1024)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(16)
  @Max(1024)
  height?: number;

  @IsOptional()
  @IsEnum(DitherMode)
  ditherMode?: DitherMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(16)
  @Max(256)
  maxColors?: number;

  @IsOptional()
  @IsBoolean()
  pixelArtMode?: boolean;
}

export interface RenderProgressUpdate {
  jobId: string;
  projectId: string;
  stage: 'INITIALIZING' | 'QUANTIZING' | 'RASTERIZING' | 'ENCODING' | 'COMPLETED' | 'FAILED';
  totalFrames: number;
  renderedFrames: number;
  progress: number; // 0.0 to 1.0
  elapsedMs: number;
  estimatedRemainingMs?: number;
}

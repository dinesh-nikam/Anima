import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GifOutputFormat } from '../models/gif.model';

export enum ExportPreset {
  HIGH_QUALITY = 'HIGH_QUALITY',
  BALANCED = 'BALANCED',
  WEB_OPTIMIZED = 'WEB_OPTIMIZED',
}

export class TriggerExportDto {
  @IsOptional()
  @IsEnum(['GIF', 'MP4', 'WEBM', 'APNG'] as const)
  outputFormat?: GifOutputFormat;

  @IsOptional()
  @IsEnum(ExportPreset)
  preset?: ExportPreset;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100 * 1024) // 100 KB min
  @Max(50 * 1024 * 1024) // 50 MB max
  targetMaxSizeBytes?: number;

  @IsOptional()
  @IsBoolean()
  dirtyRectCrop?: boolean;

  @IsOptional()
  @IsBoolean()
  lossyCompression?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  lossyThreshold?: number;
}

export interface ExportResultSummary {
  exportId: string;
  projectId: string;
  outputFormat: GifOutputFormat;
  preset: ExportPreset;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  rawBufferSizeBytes: number;
  compressionRatio: number; // e.g. 0.35 (65% reduction)
  fileHash: string;
  createdAt: string;
  downloadUrl: string;
}

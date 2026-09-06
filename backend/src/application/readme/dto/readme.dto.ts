import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Request DTOs for the README rendering API.
// ---------------------------------------------------------------------------

export class SectionConfigDto {
  @IsString()
  @MaxLength(128)
  sectionKey!: string;

  @IsString()
  @MaxLength(128)
  componentKey!: string;

  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(['HIDE_COMPONENT', 'RENDER_FALLBACK', 'RENDER_UNAVAILABLE'])
  fallback?: 'HIDE_COMPONENT' | 'RENDER_FALLBACK' | 'RENDER_UNAVAILABLE';
}

export class RenderRequestDto {
  @IsString()
  @MaxLength(128)
  templateKey!: string;

  @IsString()
  @MaxLength(128)
  themeKey!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionConfigDto)
  sections?: SectionConfigDto[];

  @IsOptional()
  @IsObject()
  customData?: Record<string, unknown>;
}

export class ValidateRequestDto {
  @IsString()
  @MaxLength(128)
  templateKey!: string;

  @IsString()
  @MaxLength(128)
  themeKey!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionConfigDto)
  sections!: SectionConfigDto[];
}

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TemplateApplyMode {
  REPLACE = 'REPLACE',
  MERGE = 'MERGE',
}

export class SectionInputDto {
  @IsString()
  @IsNotEmpty()
  componentKey: string;

  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class CreateDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  themeId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionInputDto)
  sections?: SectionInputDto[];
}

export class UpdateDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  themeId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(['DRAFT', 'VALID', 'INVALID', 'ARCHIVED'])
  status?: 'DRAFT' | 'VALID' | 'INVALID' | 'ARCHIVED';

  @IsNumber()
  @IsNotEmpty()
  expectedRevision: number;
}

export class AddSectionDto {
  @IsString()
  @IsNotEmpty()
  componentKey: string;

  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class UpdateSectionDto {
  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class ReorderSectionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  sectionIds: string[];
}

export class ApplyTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateKey: string;

  @IsOptional()
  @IsEnum(TemplateApplyMode)
  mode?: TemplateApplyMode = TemplateApplyMode.REPLACE;
}

export class WorkingSectionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  componentKey: string;

  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class PreviewDraftPayloadDto {
  @IsOptional()
  @IsString()
  themeId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingSectionDto)
  sections?: WorkingSectionDto[];
}

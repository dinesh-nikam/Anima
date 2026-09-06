import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnimationEffectInstance, AnimationConfiguration } from '../models/gif.model';

export type RandomizationProfile =
  | 'BALANCED'
  | 'CHAOTIC'
  | 'CINEMATIC'
  | 'RETRO_ARCADE'
  | 'NATURE_AMBIENT'
  | 'CYBERPUNK';

export class RandomizeProjectDto {
  @IsOptional()
  seed?: string | number;

  @IsString()
  @IsOptional()
  @IsIn(['BALANCED', 'CHAOTIC', 'CINEMATIC', 'RETRO_ARCADE', 'NATURE_AMBIENT', 'CYBERPUNK'])
  profile?: RandomizationProfile;

  @IsBoolean()
  @IsOptional()
  preserveLocked?: boolean = true;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  targetEffectCount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  @Max(10.0)
  @Type(() => Number)
  duration?: number;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(30)
  @Type(() => Number)
  fps?: number;
}

export class StatelessRandomizeDto {
  @IsOptional()
  seed?: string | number;

  @IsString()
  @IsOptional()
  @IsIn(['BALANCED', 'CHAOTIC', 'CINEMATIC', 'RETRO_ARCADE', 'NATURE_AMBIENT', 'CYBERPUNK'])
  profile?: RandomizationProfile;

  @IsOptional()
  analysis?: Record<string, any>;

  @IsArray()
  @IsOptional()
  lockedEffects?: AnimationEffectInstance[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  targetEffectCount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  @Max(10.0)
  @Type(() => Number)
  duration?: number;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(30)
  @Type(() => Number)
  fps?: number;
}

export interface RandomizeResult {
  configuration: AnimationConfiguration;
  seed: string;
  profile: RandomizationProfile;
  selectedEffectCount: number;
  preservedLockedCount: number;
  appliedBiases: string[];
}

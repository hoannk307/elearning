import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GenerateExerciseDto {
  @IsString()
  @MinLength(1)
  sessionId: string;

  /** Model AI chọn cho lần tạo này (bỏ trống = model mặc định). */
  @IsOptional()
  @IsString()
  model?: string;
}

/** Body tuỳ chọn khi tạo lại bài tập — cho phép đổi model. */
export class RegenerateExerciseDto {
  @IsOptional()
  @IsString()
  model?: string;
}

/** Học sinh nộp bài làm trên máy → AI chấm. */
export class SubmitExerciseDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  answers: string[];

  @IsOptional()
  @IsString()
  model?: string;
}

export class RecordResultDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

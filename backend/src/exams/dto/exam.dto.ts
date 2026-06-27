import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum ExamKindDto {
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  CUSTOM = 'CUSTOM',
}

export class CreateExamDto {
  @IsString()
  @MinLength(1)
  studentId: string;

  @IsString()
  @MinLength(1)
  subjectId: string;

  /** Tuỳ chọn: các buổi đưa vào đề. Bỏ trống = tất cả buổi đã học (DONE). */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sessionIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(ExamKindDto)
  kind?: ExamKindDto;

  /** Model AI chọn cho lần tạo đề này (bỏ trống = model mặc định). */
  @IsOptional()
  @IsString()
  model?: string;
}

/** Body tuỳ chọn khi tạo lại đề — cho phép đổi model. */
export class RegenerateExamDto {
  @IsOptional()
  @IsString()
  model?: string;
}

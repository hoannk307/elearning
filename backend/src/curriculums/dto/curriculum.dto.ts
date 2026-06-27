import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCurriculumDto {
  @IsString()
  @MinLength(1)
  subjectId: string;

  @IsString()
  @MinLength(10, { message: 'Nội dung chương trình quá ngắn' })
  rawText: string;

  /** Model AI chọn cho lần parse này (bỏ trống = model mặc định). */
  @IsOptional()
  @IsString()
  model?: string;
}

/** Body tuỳ chọn khi parse lại — cho phép đổi model. */
export class ReparseCurriculumDto {
  @IsOptional()
  @IsString()
  model?: string;
}

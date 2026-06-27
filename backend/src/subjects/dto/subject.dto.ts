import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @MinLength(1)
  studentId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string; // "Toán", "Tiếng Anh"...

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

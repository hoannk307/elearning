import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string; // tên đăng nhập của học sinh

  @IsString()
  @MinLength(4)
  @MaxLength(100)
  password: string; // mật khẩu học sinh

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  gradeLevel: string; // "Lớp 3", "Lớp 7"...

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(100)
  password?: string; // đổi mật khẩu học sinh (bỏ trống = giữ nguyên)

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  gradeLevel?: string;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

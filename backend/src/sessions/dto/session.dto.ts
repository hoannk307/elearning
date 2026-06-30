import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateSessionVideoDto {
  @IsUrl({}, { message: 'Link video không hợp lệ' })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}

export enum SessionStatusDto {
  PENDING = 'PENDING',
  DONE = 'DONE',
}

export class UpdateSessionStatusDto {
  @IsEnum(SessionStatusDto)
  status: SessionStatusDto;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Link YouTube không hợp lệ' })
  youtubeUrl?: string;

  @IsOptional()
  @IsEnum(SessionStatusDto)
  status?: SessionStatusDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

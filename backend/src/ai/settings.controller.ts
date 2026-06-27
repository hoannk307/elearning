import { Body, Controller, Get, Put } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { SettingsService } from './settings.service';
import { isValidModelId } from './ai.models';
import { BadRequestException } from '@nestjs/common';
import { Roles, CurrentUser } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

export class SetDefaultModelDto {
  @IsString()
  model: string;
}

/** Cấu hình số câu khi AI tạo bài tập / đề kiểm tra. */
export class QuestionConfigDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  exerciseMcCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  exerciseEssayCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  examMcCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  examEssayCount?: number;
}

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly ai: AiService,
    private readonly settings: SettingsService,
  ) {}

  /** Danh sách model + trạng thái cấu hình + model mặc định (cho UI chọn). */
  @Get('ai-models')
  async aiModels() {
    return {
      models: await this.ai.listModels(),
      defaultModel: await this.ai.getDefaultModel(),
    };
  }

  /** Đặt model AI mặc định cho toàn app (chỉ phụ huynh). */
  @Roles(Role.PARENT)
  @Put('ai-model')
  async setDefault(@Body() dto: SetDefaultModelDto) {
    if (!isValidModelId(dto.model)) {
      throw new BadRequestException('Model không hợp lệ');
    }
    await this.settings.setDefaultModel(dto.model);
    return { ok: true, defaultModel: dto.model };
  }

  /** Cấu hình số câu bài tập / đề kiểm tra của phụ huynh hiện tại. */
  @Roles(Role.PARENT)
  @Get('question-config')
  getQuestionConfig(@CurrentUser() user: AuthUser) {
    return this.settings.getQuestionConfig(user.id);
  }

  @Roles(Role.PARENT)
  @Put('question-config')
  setQuestionConfig(
    @CurrentUser() user: AuthUser,
    @Body() dto: QuestionConfigDto,
  ) {
    return this.settings.setQuestionConfig(user.id, dto);
  }
}

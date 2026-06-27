import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { ExercisesService } from './exercises.service';
import {
  GenerateExerciseDto,
  RecordResultDto,
  RegenerateExerciseDto,
  SubmitExerciseDto,
} from './dto/exercise.dto';
import { AccessService } from '../auth/access.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

/** Bỏ đáp án khỏi dữ liệu trả về cho học sinh (chỉ phụ huynh xem đáp án). */
function stripAnswerKey<T extends { answerKeyJson?: unknown }>(row: T): T {
  const { answerKeyJson: _omit, ...rest } = row;
  return rest as T;
}

@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly exercises: ExercisesService,
    private readonly access: AccessService,
  ) {}

  /** Trigger AI tạo bài tập cho 1 buổi học (phụ huynh hoặc học sinh tự tạo). */
  @Post()
  async generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateExerciseDto) {
    await this.access.assertSessionAccess(user, dto.sessionId);
    return this.exercises.generate(dto.sessionId, dto.model);
  }

  @Get()
  async findBySession(
    @CurrentUser() user: AuthUser,
    @Query('sessionId') sessionId: string,
  ) {
    await this.access.assertSessionAccess(user, sessionId);
    const list = await this.exercises.findBySession(sessionId);
    return user.role === Role.STUDENT ? list.map(stripAnswerKey) : list;
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertExerciseAccess(user, id);
    const exercise = await this.exercises.findOne(id);
    return user.role === Role.STUDENT ? stripAnswerKey(exercise) : exercise;
  }

  @Post(':id/regenerate')
  async regenerate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RegenerateExerciseDto,
  ) {
    await this.access.assertExerciseAccess(user, id);
    return this.exercises.regenerate(id, dto?.model);
  }

  /** Học sinh nộp bài làm trên máy → AI chấm. */
  @Post(':id/submit')
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitExerciseDto,
  ) {
    await this.access.assertExerciseAccess(user, id);
    return this.exercises.submit(id, dto.answers, dto.model);
  }

  /** Phụ huynh nhập điểm bài tập (chấm tay). */
  @Roles(Role.PARENT)
  @Post(':id/result')
  async recordResult(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecordResultDto,
  ) {
    await this.access.assertExerciseAccess(user, id);
    return this.exercises.recordResult(id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertExerciseAccess(user, id);
    return this.exercises.remove(id);
  }

  /** Xuất PDF — ?answers=1 để lấy bản đáp án (chỉ phụ huynh). Stream trực tiếp. */
  @Get(':id/pdf')
  async pdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('answers') answers: string,
    @Res() res: Response,
  ) {
    await this.access.assertExerciseAccess(user, id);
    const withAnswers = answers === '1' || answers === 'true';
    if (withAnswers && user.role !== Role.PARENT) {
      throw new ForbiddenException('Chỉ phụ huynh được xem bản đáp án');
    }
    const buffer = await this.exercises.renderPdf(id, withAnswers);
    const name = withAnswers ? `bai-tap-${id}-dap-an.pdf` : `bai-tap-${id}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${name}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

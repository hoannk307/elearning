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
import { ExamsService } from './exams.service';
import { CreateExamDto, RegenerateExamDto } from './dto/exam.dto';
import { AccessService } from '../auth/access.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

/** Bỏ đáp án khỏi dữ liệu trả về cho học sinh. */
function stripAnswerKey<T extends { answerKeyJson?: unknown }>(row: T): T {
  const { answerKeyJson: _omit, ...rest } = row;
  return rest as T;
}

@Controller('exams')
export class ExamsController {
  constructor(
    private readonly exams: ExamsService,
    private readonly access: AccessService,
  ) {}

  /** Tạo đề — phụ huynh hoặc học sinh tự tạo (đề của chính mình). */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateExamDto) {
    await this.access.assertStudentAccess(user, dto.studentId);
    await this.access.assertSubjectAccess(user, dto.subjectId);
    return this.exams.create(dto);
  }

  @Get()
  async findBySubject(
    @CurrentUser() user: AuthUser,
    @Query('subjectId') subjectId: string,
  ) {
    await this.access.assertSubjectAccess(user, subjectId);
    return this.exams.findBySubject(subjectId);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertExamAccess(user, id);
    const exam = await this.exams.findOne(id);
    return user.role === Role.STUDENT ? stripAnswerKey(exam) : exam;
  }

  @Post(':id/regenerate')
  async regenerate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RegenerateExamDto,
  ) {
    await this.access.assertExamAccess(user, id);
    return this.exams.regenerate(id, dto?.model);
  }

  @Roles(Role.PARENT)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertExamAccess(user, id);
    return this.exams.remove(id);
  }

  /** Xuất PDF đề thi — ?answers=1 để lấy bản đáp án (chỉ phụ huynh). */
  @Get(':id/pdf')
  async pdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('answers') answers: string,
    @Res() res: Response,
  ) {
    await this.access.assertExamAccess(user, id);
    const withAnswers = answers === '1' || answers === 'true';
    if (withAnswers && user.role !== Role.PARENT) {
      throw new ForbiddenException('Chỉ phụ huynh được xem bản đáp án');
    }
    const buffer = await this.exams.renderPdf(id, withAnswers);
    const name = withAnswers ? `de-${id}-dap-an.pdf` : `de-${id}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${name}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

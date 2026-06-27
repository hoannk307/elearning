import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ExamResultsService } from './exam-results.service';
import { AccessService } from '../auth/access.service';
import { CurrentUser } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

@Controller('exam-results')
export class ExamResultsController {
  constructor(
    private readonly results: ExamResultsService,
    private readonly access: AccessService,
  ) {}

  /**
   * Upload ảnh bài làm (field "images", tối đa 5) + examId → AI chấm.
   * Lưu ý: request chờ Claude Vision chấm xong (~15-30s).
   */
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: { fileSize: 12 * 1024 * 1024 }, // 12MB/ảnh
    }),
  )
  async grade(
    @CurrentUser() user: AuthUser,
    @Body('examId') examId: string,
    @Body('model') model: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.access.assertExamAccess(user, examId);
    return this.results.grade(examId, files, model);
  }

  @Get()
  async findByExam(
    @CurrentUser() user: AuthUser,
    @Query('examId') examId: string,
  ) {
    await this.access.assertExamAccess(user, examId);
    return this.results.findByExam(examId);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.results.findOne(id);
    await this.access.assertExamAccess(user, result.examId);
    return result;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.results.findOne(id);
    await this.access.assertExamAccess(user, result.examId);
    return this.results.remove(id);
  }
}

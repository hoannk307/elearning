import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurriculumsService } from './curriculums.service';
import { CreateCurriculumDto, ReparseCurriculumDto } from './dto/curriculum.dto';
import { AccessService } from '../auth/access.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

@Controller('curriculums')
export class CurriculumsController {
  constructor(
    private readonly curriculums: CurriculumsService,
    private readonly access: AccessService,
  ) {}

  /** Nhập text chương trình → trigger AI parse ngầm. */
  @Roles(Role.PARENT)
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCurriculumDto) {
    await this.access.assertSubjectAccess(user, dto.subjectId);
    return this.curriculums.create(dto);
  }

  @Get()
  async findBySubject(
    @CurrentUser() user: AuthUser,
    @Query('subjectId') subjectId: string,
  ) {
    await this.access.assertSubjectAccess(user, subjectId);
    return this.curriculums.findBySubject(subjectId);
  }

  /** Frontend polling endpoint này để xem tiến độ parse. */
  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertCurriculumAccess(user, id);
    return this.curriculums.findOne(id);
  }

  @Roles(Role.PARENT)
  @Post(':id/reparse')
  async reparse(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReparseCurriculumDto,
  ) {
    await this.access.assertCurriculumAccess(user, id);
    return this.curriculums.reparse(id, dto?.model);
  }

  @Roles(Role.PARENT)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertCurriculumAccess(user, id);
    return this.curriculums.remove(id);
  }
}

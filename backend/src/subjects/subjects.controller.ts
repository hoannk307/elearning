import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { AccessService } from '../auth/access.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

@Controller('subjects')
export class SubjectsController {
  constructor(
    private readonly subjects: SubjectsService,
    private readonly access: AccessService,
  ) {}

  @Roles(Role.PARENT)
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSubjectDto) {
    await this.access.assertStudentAccess(user, dto.studentId);
    return this.subjects.create(dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('studentId') studentId?: string,
  ) {
    if (studentId) {
      await this.access.assertStudentAccess(user, studentId);
      return this.subjects.findAll(studentId);
    }
    // Không truyền studentId → trả tất cả môn trong phạm vi của người dùng.
    const ids = await this.access.accessibleStudentIds(user);
    return this.subjects.findAllByStudentIds(ids);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertSubjectAccess(user, id);
    return this.subjects.findOne(id);
  }

  @Roles(Role.PARENT)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    await this.access.assertSubjectAccess(user, id);
    return this.subjects.update(id, dto);
  }

  @Roles(Role.PARENT)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertSubjectAccess(user, id);
    return this.subjects.remove(id);
  }
}

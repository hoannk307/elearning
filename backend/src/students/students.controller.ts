import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { AccessService } from '../auth/access.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly access: AccessService,
  ) {}

  @Roles(Role.PARENT)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStudentDto) {
    return this.students.create(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const ids = await this.access.accessibleStudentIds(user);
    return this.students.findManyByIds(ids);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertStudentAccess(user, id);
    return this.students.findOne(id);
  }

  @Roles(Role.PARENT)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    await this.access.assertStudentAccess(user, id);
    return this.students.update(id, dto);
  }

  @Roles(Role.PARENT)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertStudentAccess(user, id);
    return this.students.remove(id);
  }
}

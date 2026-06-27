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
import { SessionsService } from './sessions.service';
import { CreateSessionVideoDto, UpdateSessionDto } from './dto/session.dto';
import { AccessService } from '../auth/access.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly access: AccessService,
  ) {}

  @Get()
  async findBySubject(
    @CurrentUser() user: AuthUser,
    @Query('subjectId') subjectId: string,
  ) {
    await this.access.assertSubjectAccess(user, subjectId);
    return this.sessions.findBySubject(subjectId);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertSessionAccess(user, id);
    return this.sessions.findOne(id);
  }

  @Roles(Role.PARENT)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    await this.access.assertSessionAccess(user, id);
    return this.sessions.update(id, dto);
  }

  @Roles(Role.PARENT)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertSessionAccess(user, id);
    return this.sessions.remove(id);
  }

  // ─────────── Link video (chỉ phụ huynh quản lý) ───────────

  @Roles(Role.PARENT)
  @Post(':id/videos')
  async addVideo(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateSessionVideoDto,
  ) {
    await this.access.assertSessionAccess(user, id);
    return this.sessions.addVideo(id, dto);
  }

  @Roles(Role.PARENT)
  @Delete('videos/:videoId')
  async removeVideo(
    @CurrentUser() user: AuthUser,
    @Param('videoId') videoId: string,
  ) {
    const sessionId = await this.sessions.getVideoSessionId(videoId);
    await this.access.assertSessionAccess(user, sessionId);
    return this.sessions.removeVideo(videoId);
  }
}

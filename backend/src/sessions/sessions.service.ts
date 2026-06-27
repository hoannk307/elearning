import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionVideoDto, UpdateSessionDto } from './dto/session.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  findBySubject(subjectId: string) {
    return this.prisma.session.findMany({
      where: { subjectId },
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: { select: { exercises: true } },
        videos: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        exercises: { orderBy: { createdAt: 'desc' } },
        subject: { include: { student: true } },
        videos: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Không tìm thấy buổi học');
    return session;
  }

  async update(id: string, dto: UpdateSessionDto) {
    await this.findOne(id);
    return this.prisma.session.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.session.delete({ where: { id } });
  }

  /** Thêm 1 link video vào buổi học (xếp cuối danh sách). */
  async addVideo(sessionId: string, dto: CreateSessionVideoDto) {
    await this.findOne(sessionId);
    const count = await this.prisma.sessionVideo.count({ where: { sessionId } });
    return this.prisma.sessionVideo.create({
      data: {
        sessionId,
        url: dto.url,
        label: dto.label,
        orderIndex: count,
      },
    });
  }

  /** Lấy sessionId của 1 video (để kiểm tra quyền trước khi xoá). */
  async getVideoSessionId(videoId: string): Promise<string> {
    const video = await this.prisma.sessionVideo.findUnique({
      where: { id: videoId },
      select: { sessionId: true },
    });
    if (!video) throw new NotFoundException('Không tìm thấy link video');
    return video.sessionId;
  }

  removeVideo(videoId: string) {
    return this.prisma.sessionVideo.delete({ where: { id: videoId } });
  }
}

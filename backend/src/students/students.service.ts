import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tạo học sinh thuộc về phụ huynh hiện tại + tài khoản đăng nhập. */
  async create(parentId: string, dto: CreateStudentDto) {
    await this.assertUsernameFree(dto.username);
    const passwordHash = await AuthService.hash(dto.password);
    return this.prisma.student.create({
      data: {
        parentId,
        username: dto.username,
        passwordHash,
        name: dto.name,
        gradeLevel: dto.gradeLevel,
        age: dto.age,
        notes: dto.notes,
      },
    });
  }

  /** Danh sách học sinh theo phạm vi truy cập (đã lọc ở controller). */
  findManyByIds(ids: string[]) {
    return this.prisma.student.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { subjects: true } } },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        subjects: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!student) throw new NotFoundException('Không tìm thấy học sinh');
    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id);
    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.passwordHash = await AuthService.hash(password);
    return this.prisma.student.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.student.delete({ where: { id } });
  }

  private async assertUsernameFree(username: string) {
    const [parent, student] = await Promise.all([
      this.prisma.parent.findUnique({ where: { username } }),
      this.prisma.student.findUnique({ where: { username } }),
    ]);
    if (parent || student) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }
  }
}

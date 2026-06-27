import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, JwtPayload } from './auth.types';
import { RegisterDto } from './dto/register.dto';

export interface LoginResult {
  token: string;
  id: string;
  role: Role;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Băm mật khẩu (dùng khi tạo phụ huynh / học sinh). */
  static hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Đăng nhập: tra phụ huynh trước, rồi học sinh.
   * Trả về JWT + thông tin cơ bản.
   */
  async login(username: string, password: string): Promise<LoginResult> {
    const parent = await this.prisma.parent.findUnique({
      where: { username },
      omit: { passwordHash: false },
    });
    if (parent && (await bcrypt.compare(password, parent.passwordHash))) {
      return this.issue({ sub: parent.id, role: Role.PARENT, name: parent.name });
    }

    const student = await this.prisma.student.findUnique({
      where: { username },
      omit: { passwordHash: false },
    });
    if (student && (await bcrypt.compare(password, student.passwordHash))) {
      return this.issue({
        sub: student.id,
        role: Role.STUDENT,
        name: student.name,
        parentId: student.parentId,
      });
    }

    throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
  }

  /** Kiểm tra username còn trống không (dùng trên cả parent & student). */
  async usernameAvailable(username: string): Promise<boolean> {
    if (!username || username.length < 3) return false;
    const [parent, student] = await Promise.all([
      this.prisma.parent.findUnique({ where: { username } }),
      this.prisma.student.findUnique({ where: { username } }),
    ]);
    return !parent && !student;
  }

  /** Đăng ký phụ huynh mới rồi đăng nhập luôn (trả JWT). */
  async register(dto: RegisterDto): Promise<LoginResult> {
    if (!(await this.usernameAvailable(dto.username))) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }
    const existedEmail = await this.prisma.parent.findUnique({
      where: { email: dto.email },
    });
    if (existedEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const parent = await this.prisma.parent.create({
      data: {
        username: dto.username,
        passwordHash: await AuthService.hash(dto.password),
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });

    return this.issue({ sub: parent.id, role: Role.PARENT, name: parent.name });
  }

  /** Lấy lại thông tin người dùng từ token (cho GET /auth/me). */
  me(user: AuthUser): AuthUser {
    return user;
  }

  private async issue(payload: JwtPayload): Promise<LoginResult> {
    const token = await this.jwt.signAsync(payload);
    return { token, id: payload.sub, role: payload.role, name: payload.name };
  }
}

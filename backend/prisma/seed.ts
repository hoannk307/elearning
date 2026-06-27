import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // 1 phụ huynh mẫu — đăng nhập để quản lý học sinh
  const parent = await prisma.parent.upsert({
    where: { username: 'phuhuynh' },
    update: {},
    create: {
      username: 'phuhuynh',
      passwordHash: await hash('123456'),
      name: 'Phụ huynh mẫu',
    },
  });

  // 2 học sinh mẫu (mỗi bé có tài khoản đăng nhập riêng)
  const an = await prisma.student.upsert({
    where: { username: 'be_an' },
    update: {},
    create: {
      parentId: parent.id,
      username: 'be_an',
      passwordHash: await hash('123456'),
      name: 'Bé An',
      gradeLevel: 'Lớp 3',
      age: 8,
    },
  });

  const binh = await prisma.student.upsert({
    where: { username: 'be_binh' },
    update: {},
    create: {
      parentId: parent.id,
      username: 'be_binh',
      passwordHash: await hash('123456'),
      name: 'Bé Bình',
      gradeLevel: 'Lớp 7',
      age: 12,
    },
  });

  console.log('✅ Đã tạo dữ liệu mẫu:');
  console.log('   Phụ huynh: phuhuynh / 123456');
  console.log('   Học sinh:  be_an / 123456, be_binh / 123456');
  console.log({ parent: parent.id, an: an.id, binh: binh.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

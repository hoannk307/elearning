import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';
import { PdfModule } from './pdf/pdf.module';
import { StudentsModule } from './students/students.module';
import { SubjectsModule } from './subjects/subjects.module';
import { CurriculumsModule } from './curriculums/curriculums.module';
import { SessionsModule } from './sessions/sessions.module';
import { ExercisesModule } from './exercises/exercises.module';
import { ExamsModule } from './exams/exams.module';
import { ExamResultsModule } from './exam-results/exam-results.module';
import { ReportsModule } from './reports/reports.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    QueueModule,
    StorageModule,
    AiModule,
    PdfModule,
    StudentsModule,
    SubjectsModule,
    CurriculumsModule,
    SessionsModule,
    ExercisesModule,
    ExamsModule,
    ExamResultsModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

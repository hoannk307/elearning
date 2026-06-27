import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { ExamProcessor } from './exam.processor';
import { EXAM_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: EXAM_QUEUE })],
  providers: [ExamsService, ExamProcessor],
  controllers: [ExamsController],
})
export class ExamsModule {}

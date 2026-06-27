import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CurriculumsService } from './curriculums.service';
import { CurriculumsController } from './curriculums.controller';
import { CurriculumProcessor } from './curriculum.processor';
import { CURRICULUM_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: CURRICULUM_QUEUE })],
  providers: [CurriculumsService, CurriculumProcessor],
  controllers: [CurriculumsController],
})
export class CurriculumsModule {}

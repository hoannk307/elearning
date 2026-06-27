import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { ExerciseProcessor } from './exercise.processor';
import { EXERCISE_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: EXERCISE_QUEUE })],
  providers: [ExercisesService, ExerciseProcessor],
  controllers: [ExercisesController],
})
export class ExercisesModule {}

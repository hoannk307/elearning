-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "exam_essay_count" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "exam_mc_count" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "exercise_essay_count" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "exercise_mc_count" INTEGER NOT NULL DEFAULT 15;


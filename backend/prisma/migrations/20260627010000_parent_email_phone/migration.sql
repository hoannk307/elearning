-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "parents_email_key" ON "parents"("email");


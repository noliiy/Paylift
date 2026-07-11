-- AlterTable
ALTER TABLE "users" ADD COLUMN "google_subject" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");

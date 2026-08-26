-- CreateEnum
CREATE TYPE "InvitationEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "InstituteInvitation" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailStatus" "InvitationEmailStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "InstituteInvitation_emailStatus_idx" ON "InstituteInvitation"("emailStatus");

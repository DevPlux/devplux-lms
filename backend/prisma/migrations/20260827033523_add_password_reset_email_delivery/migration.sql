-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailStatus" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "PasswordResetToken_emailStatus_idx" ON "PasswordResetToken"("emailStatus");

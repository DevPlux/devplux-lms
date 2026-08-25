-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "InstituteInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "InstituteRole" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstituteInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstituteInvitation_tenantId_idx" ON "InstituteInvitation"("tenantId");

-- CreateIndex
CREATE INDEX "InstituteInvitation_invitedByUserId_idx" ON "InstituteInvitation"("invitedByUserId");

-- CreateIndex
CREATE INDEX "InstituteInvitation_email_idx" ON "InstituteInvitation"("email");

-- CreateIndex
CREATE INDEX "InstituteInvitation_status_idx" ON "InstituteInvitation"("status");

-- CreateIndex
CREATE INDEX "InstituteInvitation_expiresAt_idx" ON "InstituteInvitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteInvitation_tenantId_email_status_key" ON "InstituteInvitation"("tenantId", "email", "status");

-- AddForeignKey
ALTER TABLE "InstituteInvitation" ADD CONSTRAINT "InstituteInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteInvitation" ADD CONSTRAINT "InstituteInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

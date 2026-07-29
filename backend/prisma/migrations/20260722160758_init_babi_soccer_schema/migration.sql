-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- DropIndex
DROP INDEX "Tournament_status_isPublic_idx";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "passcode" TEXT;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "status" "JoinStatus" NOT NULL DEFAULT 'ACCEPTED';

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "Tournament_status_isPublic_isApproved_idx" ON "Tournament"("status", "isPublic", "isApproved");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

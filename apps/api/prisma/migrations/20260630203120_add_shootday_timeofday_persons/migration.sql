-- CreateEnum
CREATE TYPE "ShootTimeOfDay" AS ENUM ('DAY', 'NIGHT');

-- AlterTable
ALTER TABLE "ShootDay" ADD COLUMN     "personsRequired" INTEGER,
ADD COLUMN     "timeOfDay" "ShootTimeOfDay";

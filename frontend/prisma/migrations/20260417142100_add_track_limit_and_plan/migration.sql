-- AlterTable
ALTER TABLE "app"."profiles" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "track_limit" INTEGER NOT NULL DEFAULT 5;

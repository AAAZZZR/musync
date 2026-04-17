-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateTable
CREATE TABLE "app"."profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "preferred_mood" TEXT NOT NULL DEFAULT 'focus',
    "daily_focus_minutes" INTEGER NOT NULL DEFAULT 90,
    "background_volume" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."tracks" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "stream_url" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."focus_sessions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."generation_jobs" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "prompt_normalized" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'ace-1.5',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "duration_sec" INTEGER NOT NULL,
    "track_id" TEXT,
    "provider_job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."playback_sessions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "prompt_normalized" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playback_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."seed_tracks" (
    "id" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "stream_url" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "seed_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "app"."profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "app"."profiles"("email");

-- CreateIndex
CREATE INDEX "tracks_profile_id_idx" ON "app"."tracks"("profile_id");

-- CreateIndex
CREATE INDEX "tracks_mood_idx" ON "app"."tracks"("mood");

-- CreateIndex
CREATE INDEX "focus_sessions_profile_id_idx" ON "app"."focus_sessions"("profile_id");

-- CreateIndex
CREATE INDEX "focus_sessions_status_idx" ON "app"."focus_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "generation_jobs_track_id_key" ON "app"."generation_jobs"("track_id");

-- CreateIndex
CREATE INDEX "generation_jobs_profile_id_idx" ON "app"."generation_jobs"("profile_id");

-- CreateIndex
CREATE INDEX "generation_jobs_status_idx" ON "app"."generation_jobs"("status");

-- CreateIndex
CREATE INDEX "playback_sessions_profile_id_idx" ON "app"."playback_sessions"("profile_id");

-- CreateIndex
CREATE INDEX "seed_tracks_mood_idx" ON "app"."seed_tracks"("mood");

-- AddForeignKey
ALTER TABLE "app"."tracks" ADD CONSTRAINT "tracks_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "app"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."focus_sessions" ADD CONSTRAINT "focus_sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "app"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."generation_jobs" ADD CONSTRAINT "generation_jobs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "app"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."generation_jobs" ADD CONSTRAINT "generation_jobs_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "app"."tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."playback_sessions" ADD CONSTRAINT "playback_sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "app"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

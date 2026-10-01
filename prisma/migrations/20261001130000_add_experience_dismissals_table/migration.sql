-- Phase 52's ExperienceDismissal model was added to schema.prisma without a
-- corresponding migration ever being generated — every other phase in this
-- era (48-55) needed no schema change, so the gap went unnoticed until a
-- real database without this table hit P2021 on `experienceDismissal.findMany`.

-- CreateTable
CREATE TABLE "experience_dismissals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "experience_type" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "dismissed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "experience_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experience_dismissals_user_id_fingerprint_key" ON "experience_dismissals"("user_id", "fingerprint");
CREATE INDEX "experience_dismissals_user_id_experience_type_idx" ON "experience_dismissals"("user_id", "experience_type");

-- AddForeignKey
ALTER TABLE "experience_dismissals" ADD CONSTRAINT "experience_dismissals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

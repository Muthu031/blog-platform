-- Add first-login enforcement flag to users.
ALTER TABLE "users"
ADD COLUMN "first_login_required" BOOLEAN NOT NULL DEFAULT false;


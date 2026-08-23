import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE TABLE "user_share_allowlist" (
  "ownerId" uuid NOT NULL,
  "allowedUserId" uuid NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "createdBy" uuid NOT NULL,
  CONSTRAINT "user_share_allowlist_pkey" PRIMARY KEY ("ownerId", "allowedUserId"),
  CONSTRAINT "user_share_allowlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "user_share_allowlist_allowedUserId_fkey" FOREIGN KEY ("allowedUserId") REFERENCES "user" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);`.execute(db);
  await sql`CREATE INDEX "user_share_allowlist_allowedUserId_idx" ON "user_share_allowlist" ("allowedUserId");`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE "user_share_allowlist";`.execute(db);
}

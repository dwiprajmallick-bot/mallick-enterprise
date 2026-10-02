ALTER TABLE "User"
ADD COLUMN "username" TEXT NOT NULL DEFAULT 'admin';

CREATE UNIQUE INDEX "User_username_key"
ON "User"("username");

CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AdminSession_tokenHash_key"
ON "AdminSession"("tokenHash");

CREATE INDEX "AdminSession_userId_idx"
ON "AdminSession"("userId");

CREATE INDEX "AdminSession_expiresAt_idx"
ON "AdminSession"("expiresAt");

CREATE INDEX "AdminSession_revokedAt_idx"
ON "AdminSession"("revokedAt");

CREATE INDEX "AdminSession_createdAt_idx"
ON "AdminSession"("createdAt");
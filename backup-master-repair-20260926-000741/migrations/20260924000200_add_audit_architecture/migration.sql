-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorUserId_fkey"
      FOREIGN KEY ("actorUserId")
      REFERENCES "User" ("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key"
ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key"
ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx"
ON "User"("role");

-- CreateIndex
CREATE INDEX "User_active_idx"
ON "User"("active");

-- CreateIndex
CREATE INDEX "User_createdAt_idx"
ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx"
ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx"
ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx"
ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx"
ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_referenceType_referenceId_idx"
ON "AuditLog"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx"
ON "AuditLog"("createdAt");

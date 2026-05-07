-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "quotaCharsMonth" INTEGER NOT NULL DEFAULT 500000,
    "usageCharsMonth" INTEGER NOT NULL DEFAULT 0,
    "lastQuotaReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "id", "isActive", "name", "passwordHash", "role", "updatedAt", "username") SELECT "avatarUrl", "createdAt", "id", "isActive", "name", "passwordHash", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE TABLE "new_VoiceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/wav',
    "description" TEXT NOT NULL DEFAULT '',
    "featureR2Key" TEXT,
    "featureUrl" TEXT,
    "featureSize" INTEGER,
    "voxcpmVersion" TEXT,
    "vaeVersion" TEXT,
    "defaultMode" TEXT NOT NULL DEFAULT 'reference',
    "trimVad" BOOLEAN NOT NULL DEFAULT false,
    "fingerprint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VoiceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VoiceProfile" ("audioUrl", "createdAt", "description", "fileName", "fileSize", "id", "mimeType", "name", "r2Key", "updatedAt", "userId") SELECT "audioUrl", "createdAt", "description", "fileName", "fileSize", "id", "mimeType", "name", "r2Key", "updatedAt", "userId" FROM "VoiceProfile";
DROP TABLE "VoiceProfile";
ALTER TABLE "new_VoiceProfile" RENAME TO "VoiceProfile";
CREATE INDEX "VoiceProfile_userId_createdAt_idx" ON "VoiceProfile"("userId", "createdAt");
CREATE UNIQUE INDEX "VoiceProfile_userId_fingerprint_key" ON "VoiceProfile"("userId", "fingerprint");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

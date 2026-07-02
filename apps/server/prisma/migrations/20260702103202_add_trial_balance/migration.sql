-- CreateTable
CREATE TABLE "FsliGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "normalSign" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrialBalanceImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    CONSTRAINT "TrialBalanceImport_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrialBalanceImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrialBalanceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    CONSTRAINT "TrialBalanceLine_importId_fkey" FOREIGN KEY ("importId") REFERENCES "TrialBalanceImport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrialBalanceLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engagementId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fsliGroupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountMapping_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountMapping_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountMapping_fsliGroupId_fkey" FOREIGN KEY ("fsliGroupId") REFERENCES "FsliGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FsliGroup_code_key" ON "FsliGroup"("code");

-- CreateIndex
CREATE INDEX "Account_engagementId_idx" ON "Account"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_engagementId_code_key" ON "Account"("engagementId", "code");

-- CreateIndex
CREATE INDEX "TrialBalanceImport_engagementId_idx" ON "TrialBalanceImport"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialBalanceImport_engagementId_kind_key" ON "TrialBalanceImport"("engagementId", "kind");

-- CreateIndex
CREATE INDEX "TrialBalanceLine_importId_idx" ON "TrialBalanceLine"("importId");

-- CreateIndex
CREATE INDEX "TrialBalanceLine_accountId_idx" ON "TrialBalanceLine"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountMapping_accountId_key" ON "AccountMapping"("accountId");

-- CreateIndex
CREATE INDEX "AccountMapping_engagementId_idx" ON "AccountMapping"("engagementId");

-- CreateIndex
CREATE INDEX "AccountMapping_fsliGroupId_idx" ON "AccountMapping"("fsliGroupId");

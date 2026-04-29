-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdName" TEXT NOT NULL,
    "isMarried" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "spouseIndex" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "ssnLast4" TEXT NOT NULL,
    CONSTRAINT "Person_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "ownerPersonId" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "custodian" TEXT,
    "accountNumberLast4" TEXT,
    "displayLabel" TEXT NOT NULL,
    "interestRateBps" INTEGER,
    "propertyAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" DATETIME,
    CONSTRAINT "Account_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Account_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaticFinancialProfile" (
    "clientId" TEXT NOT NULL PRIMARY KEY,
    "monthlyInflowCents" BIGINT NOT NULL,
    "monthlyOutflowCents" BIGINT NOT NULL,
    "insuranceDeductibles" TEXT NOT NULL DEFAULT '[]',
    "floorCents" BIGINT NOT NULL DEFAULT 100000,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaticFinancialProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuarterlySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "meetingDate" DATETIME NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalQuarter" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" DATETIME,
    "finalizedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuarterlySnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuarterlySnapshot_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SnapshotAccountBalance" (
    "snapshotId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "balanceCents" BIGINT NOT NULL,
    "cashBalanceCents" BIGINT,

    PRIMARY KEY ("snapshotId", "accountId"),
    CONSTRAINT "SnapshotAccountBalance_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "QuarterlySnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SnapshotAccountBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SnapshotCashflow" (
    "snapshotId" TEXT NOT NULL PRIMARY KEY,
    "inflowCents" BIGINT NOT NULL,
    "outflowCents" BIGINT NOT NULL,
    "privateReserveBalanceCents" BIGINT NOT NULL,
    "schwabInvestmentBalanceCents" BIGINT,
    CONSTRAINT "SnapshotCashflow_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "QuarterlySnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SnapshotTrustValue" (
    "snapshotId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "zillowValueCents" BIGINT NOT NULL,
    "zillowPulledAt" DATETIME,

    PRIMARY KEY ("snapshotId", "accountId"),
    CONSTRAINT "SnapshotTrustValue_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "QuarterlySnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SnapshotTrustValue_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,
    "computedTotals" TEXT NOT NULL,
    CONSTRAINT "Report_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "QuarterlySnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_archivedAt_idx" ON "Client"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Person_clientId_spouseIndex_key" ON "Person"("clientId", "spouseIndex");

-- CreateIndex
CREATE INDEX "Account_clientId_idx" ON "Account"("clientId");

-- CreateIndex
CREATE INDEX "Account_clientId_category_idx" ON "Account"("clientId", "category");

-- CreateIndex
CREATE INDEX "QuarterlySnapshot_clientId_idx" ON "QuarterlySnapshot"("clientId");

-- CreateIndex
CREATE INDEX "QuarterlySnapshot_status_idx" ON "QuarterlySnapshot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlySnapshot_clientId_fiscalYear_fiscalQuarter_key" ON "QuarterlySnapshot"("clientId", "fiscalYear", "fiscalQuarter");

-- CreateIndex
CREATE UNIQUE INDEX "Report_snapshotId_kind_key" ON "Report"("snapshotId", "kind");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

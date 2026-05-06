-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'SETTLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PREPARED', 'SUBMITTED', 'VALIDATED', 'REFLECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "TrustlineStatus" AS ENUM ('PENDING', 'ACTIVE', 'FROZEN', 'REVOKED');

-- CreateEnum
CREATE TYPE "WalletRole" AS ENUM ('ISSUER', 'TREASURY', 'INVESTOR');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PORTFOLIO_MANAGER', 'SETTLEMENT_OFFICER', 'INVESTOR', 'AUDITOR', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "investorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "issuerAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'testnet',
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "encryptedSeed" TEXT NOT NULL,
    "role" "WalletRole" NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'testnet',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fund" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "network" TEXT NOT NULL DEFAULT 'testnet',
    "treasuryAddress" TEXT NOT NULL,
    "treasuryWalletId" TEXT NOT NULL,
    "issuerAddress" TEXT NOT NULL,
    "issuerWalletId" TEXT,
    "tokenId" TEXT NOT NULL,
    "totalIssued" DECIMAL(30,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "walletAddress" TEXT NOT NULL,
    "walletId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "ownershipBp" INTEGER NOT NULL,
    "beginningValueUsd" DECIMAL(30,6) NOT NULL,
    "trustlineStatus" "TrustlineStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distribution" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalDistributableUsd" DECIMAL(30,6) NOT NULL,
    "fxReferenceRateKrwPerUsd" DECIMAL(20,6),
    "status" "DistributionStatus" NOT NULL DEFAULT 'DRAFT',
    "calculatedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributionItem" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "ownershipBp" INTEGER NOT NULL,
    "amountUsd" DECIMAL(30,6) NOT NULL,
    "amountKrw" DECIMAL(30,6),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PREPARED',
    "txHash" TEXT,
    "ledgerIndex" INTEGER,
    "validatedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XrplTransaction" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "txType" TEXT NOT NULL,
    "fundId" TEXT,
    "distributionId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PREPARED',
    "ledgerIndex" INTEGER,
    "amount" DECIMAL(30,6),
    "currencyCode" TEXT,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "destinationTag" INTEGER,
    "rawResult" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "XrplTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DECIMAL(20,6) NOT NULL,
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Token_currencyCode_issuerAddress_network_key" ON "Token"("currencyCode", "issuerAddress", "network");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Fund_treasuryWalletId_key" ON "Fund"("treasuryWalletId");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_externalId_key" ON "Investor"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_walletId_key" ON "Investor"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "Investment_fundId_investorId_key" ON "Investment"("fundId", "investorId");

-- CreateIndex
CREATE UNIQUE INDEX "Distribution_fundId_period_key" ON "Distribution"("fundId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "DistributionItem_distributionId_investorId_key" ON "DistributionItem"("distributionId", "investorId");

-- CreateIndex
CREATE UNIQUE INDEX "XrplTransaction_txHash_key" ON "XrplTransaction"("txHash");

-- CreateIndex
CREATE INDEX "XrplTransaction_fundId_submittedAt_idx" ON "XrplTransaction"("fundId", "submittedAt");

-- CreateIndex
CREATE INDEX "FxRate_base_quote_observedAt_idx" ON "FxRate"("base", "quote", "observedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_treasuryWalletId_fkey" FOREIGN KEY ("treasuryWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_issuerWalletId_fkey" FOREIGN KEY ("issuerWalletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investor" ADD CONSTRAINT "Investor_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionItem" ADD CONSTRAINT "DistributionItem_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "Distribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionItem" ADD CONSTRAINT "DistributionItem_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XrplTransaction" ADD CONSTRAINT "XrplTransaction_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XrplTransaction" ADD CONSTRAINT "XrplTransaction_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "Distribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

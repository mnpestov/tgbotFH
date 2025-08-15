/*
  Warnings:

  - Made the column `chatId` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tgUserId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "tariffCode" TEXT NOT NULL,
    "amountKopecks" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("amountKopecks", "chatId", "createdAt", "id", "provider", "providerOrderId", "status", "tariffCode", "tgUserId", "updatedAt") SELECT "amountKopecks", "chatId", "createdAt", "id", "provider", "providerOrderId", "status", "tariffCode", "tgUserId", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_providerOrderId_key" ON "Order"("providerOrderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

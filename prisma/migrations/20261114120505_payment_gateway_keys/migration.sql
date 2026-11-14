-- CreateTable
CREATE TABLE `payment_gateways` (
    `provider` VARCHAR(20) NOT NULL,
    `environment` VARCHAR(12) NOT NULL DEFAULT 'sandbox',
    `publicKey` VARCHAR(200) NOT NULL,
    `secretKeyEnc` TEXT NOT NULL,
    `webhookSecretEnc` TEXT NULL,
    `secretHint` VARCHAR(8) NOT NULL,
    `webhookHint` VARCHAR(8) NULL,
    `updatedById` VARCHAR(64) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

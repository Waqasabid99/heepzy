-- CreateTable
CREATE TABLE `outbound_messages` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `event` VARCHAR(30) NOT NULL,
    `channel` VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    `phone` VARCHAR(20) NOT NULL,
    `body` TEXT NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    `handledById` VARCHAR(64) NULL,
    `handledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `outbound_messages_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `outbound_messages_orderId_event_key`(`orderId`, `event`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_templates` (
    `event` VARCHAR(30) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `body` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`event`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `outbound_messages` ADD CONSTRAINT `outbound_messages_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `orders` MODIFY `paymentMethod` ENUM('COD', 'CARD', 'WALLET', 'MANUAL') NOT NULL;

-- AlterTable
ALTER TABLE `payments` MODIFY `provider` ENUM('COD', 'SAFEPAY', 'MANUAL') NOT NULL,
    MODIFY `method` ENUM('COD', 'CARD', 'WALLET', 'MANUAL') NOT NULL;

-- AlterTable
ALTER TABLE `webhook_events` MODIFY `provider` ENUM('COD', 'SAFEPAY', 'MANUAL') NOT NULL;

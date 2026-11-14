-- AlterTable
ALTER TABLE `payments` MODIFY `provider` ENUM('COD', 'SAFEPAY') NOT NULL;

-- AlterTable
ALTER TABLE `webhook_events` MODIFY `provider` ENUM('COD', 'SAFEPAY') NOT NULL;

